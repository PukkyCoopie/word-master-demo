/**
 * 词典网络加载：生产环境为 Brotli 压缩包 + meta；开发环境为明文 dict.json。
 */

/** @typedef {{ format?: string, compressedBytes?: number, uncompressedBytes?: number }} DictionaryMeta */

const PROGRESS_AFTER_COMPRESSED_DOWNLOAD = 0.28;
const PROGRESS_AFTER_DECOMPRESS = 0.62;

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function raf() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

function supportsBrotliDecompressionStream() {
  if (typeof DecompressionStream === "undefined") return false;
  try {
    // eslint-disable-next-line no-new
    new DecompressionStream("brotli");
    return true;
  } catch {
    return false;
  }
}

/** @type {Promise<{ decompress: (input: Uint8Array) => Uint8Array }> | null} */
let brotliWasmModulePromise = null;

function loadBrotliWasmModule() {
  if (!brotliWasmModulePromise) {
    brotliWasmModulePromise = import("brotli-dec-wasm")
      .then((mod) => mod.default)
      .then((init) => init);
  }
  return brotliWasmModulePromise;
}

/**
 * @param {Uint8Array} compressed
 * @param {DictionaryMeta | null | undefined} meta
 * @param {{ shouldAbort?: () => boolean, onProgress?: (ratio01: number) => void }} options
 * @returns {Promise<string>}
 */
async function decompressBrotliWithWasm(compressed, meta, options = {}) {
  const { shouldAbort, onProgress } = options;
  onProgress?.(0);
  await raf();
  if (shouldAbort?.()) throw new Error("词典加载已取消");

  const brotli = await loadBrotliWasmModule();
  if (shouldAbort?.()) throw new Error("词典加载已取消");
  onProgress?.(0.08);
  await raf();

  let bytes;
  try {
    bytes = brotli.decompress(compressed);
  } catch {
    throw new Error("词典解压失败");
  }
  if (shouldAbort?.()) throw new Error("词典加载已取消");

  const targetBytes = Math.max(
    1,
    Number(meta?.uncompressedBytes) || bytes.length || compressed.length * 4,
  );
  onProgress?.(clamp01(bytes.length / targetBytes));
  await raf();
  onProgress?.(1);
  return new TextDecoder().decode(bytes);
}

/**
 * @param {string} url
 * @param {{ shouldAbort?: () => boolean, onProgress?: (ratio01: number) => void }} [options]
 * @returns {Promise<Uint8Array>}
 */
async function downloadBinary(url, options = {}) {
  const { shouldAbort, onProgress } = options;
  const res = await fetch(url);
  if (!res.ok) throw new Error("词典加载失败");

  const total = Number(res.headers.get("Content-Length") || 0) || 0;
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.(1);
    return buf;
  }

  const reader = res.body.getReader();
  /** @type {Uint8Array[]} */
  const chunks = [];
  let received = 0;

  while (true) {
    if (shouldAbort?.()) throw new Error("词典加载已取消");
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    if (total > 0) {
      onProgress?.(clamp01(received / total));
    } else {
      onProgress?.(1 - Math.exp(-received / (512 * 1024)));
    }
  }

  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  onProgress?.(1);
  return out;
}

/**
 * @param {Uint8Array} compressed
 * @param {DictionaryMeta | null | undefined} meta
 * @param {{ shouldAbort?: () => boolean, onProgress?: (ratio01: number) => void }} [options]
 * @returns {Promise<string>}
 */
async function decompressBrotliToText(compressed, meta, options = {}) {
  const { shouldAbort, onProgress } = options;
  if (!supportsBrotliDecompressionStream()) {
    return decompressBrotliWithWasm(compressed, meta, options);
  }

  const targetBytes = Math.max(
    1,
    Number(meta?.uncompressedBytes) || compressed.length * 4,
  );

  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("brotli"));
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let decompressed = 0;
  let lastYield = performance.now();

  while (true) {
    if (shouldAbort?.()) throw new Error("词典加载已取消");
    const { done, value } = await reader.read();
    if (done) break;
    decompressed += value.length;
    text += decoder.decode(value, { stream: true });
    onProgress?.(clamp01(decompressed / targetBytes));

    const now = performance.now();
    if (now - lastYield >= 16) {
      await raf();
      lastYield = now;
    }
  }
  text += decoder.decode();
  onProgress?.(1);
  return text;
}

/**
 * @param {string} url
 * @param {DictionaryMeta | null | undefined} meta
 * @param {{ shouldAbort?: () => boolean, onDownloadProgress?: (ratio01: number) => void, onDecompressProgress?: (ratio01: number) => void }} [options]
 */
export async function fetchDictionaryTextFromBrotli(url, meta, options = {}) {
  const { shouldAbort, onDownloadProgress, onDecompressProgress } = options;
  const compressed = await downloadBinary(url, {
    shouldAbort,
    onProgress: onDownloadProgress,
  });
  if (shouldAbort?.()) throw new Error("词典加载已取消");
  return decompressBrotliToText(compressed, meta, {
    shouldAbort,
    onProgress: onDecompressProgress,
  });
}

/**
 * @param {string} url
 * @param {{ shouldAbort?: () => boolean, onProgress?: (ratio01: number) => void }} [options]
 */
export async function fetchDictionaryTextPlain(url, options = {}) {
  const { shouldAbort, onProgress } = options;
  const res = await fetch(url);
  if (!res.ok) throw new Error("词典加载失败");

  let downloadByteTarget = Number(res.headers.get("Content-Length") || 0) || 0;
  const hasByteEstimate = downloadByteTarget > 0;

  let text = "";
  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    while (true) {
      if (shouldAbort?.()) throw new Error("词典加载已取消");
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (hasByteEstimate) {
        if (received > downloadByteTarget) {
          downloadByteTarget = Math.max(downloadByteTarget, Math.ceil(received * 1.12));
        }
        onProgress?.(clamp01(received / downloadByteTarget) * PROGRESS_AFTER_COMPRESSED_DOWNLOAD);
      } else {
        onProgress?.(
          PROGRESS_AFTER_COMPRESSED_DOWNLOAD * (1 - Math.exp(-received / (4 * 1024 * 1024))),
        );
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } else {
    text = await res.text();
    onProgress?.(PROGRESS_AFTER_COMPRESSED_DOWNLOAD * 0.92);
  }

  onProgress?.(PROGRESS_AFTER_COMPRESSED_DOWNLOAD);
  return text;
}

/**
 * @param {string} baseUrl  如 ./data/dictionary/
 * @param {{ shouldAbort?: () => boolean, bumpLoadProgress: (p: number) => void }} options
 */
export async function resolveDictionaryText(baseUrl, options) {
  const { shouldAbort, bumpLoadProgress } = options;
  const base = baseUrl.replace(/\/+$/, "") + "/";

  /** @type {DictionaryMeta | null} */
  let meta = null;
  try {
    const metaRes = await fetch(`${base}dict.meta.json`);
    if (metaRes.ok) meta = await metaRes.json();
  } catch {
    meta = null;
  }

  if (meta?.format === "brotli") {
    return fetchDictionaryTextFromBrotli(`${base}dict.json.br`, meta, {
      shouldAbort,
      onDownloadProgress: (ratio) => {
        bumpLoadProgress(ratio * PROGRESS_AFTER_COMPRESSED_DOWNLOAD);
      },
      onDecompressProgress: (ratio) => {
        bumpLoadProgress(
          PROGRESS_AFTER_COMPRESSED_DOWNLOAD +
            ratio * (PROGRESS_AFTER_DECOMPRESS - PROGRESS_AFTER_COMPRESSED_DOWNLOAD),
        );
      },
    });
  }

  return fetchDictionaryTextPlain(`${base}dict.json`, {
    shouldAbort,
    onProgress: (ratio) => bumpLoadProgress(ratio),
  });
}

export {
  PROGRESS_AFTER_COMPRESSED_DOWNLOAD,
  PROGRESS_AFTER_DECOMPRESS,
};
