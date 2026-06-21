/**
 * 词典加载：
 * - Web：Brotli 分包（传输体积更小）
 * - Capacitor 原生：随包 JSONL 明文（无解压，兼容性更好）
 * - 开发：明文 dict.json
 */

import { isCapacitorNativePlatform } from "./dictionaryPlatform.js";

/** @typedef {{
 *   format?: string,
 *   split?: boolean,
 *   coreFile?: string,
 *   defsFile?: string,
 *   nativeCoreFile?: string,
 *   nativeDefsFile?: string,
 *   compressedBytes?: number,
 *   uncompressedBytes?: number,
 *   coreUncompressedBytes?: number,
 *   defsUncompressedBytes?: number,
 * }} DictionaryMeta */

/** @typedef {{
 *   mode: "split",
 *   coreText: string,
 *   defsUrl: string,
 *   defsCompressed: boolean,
 *   defsMeta: DictionaryMeta | null,
 * } | {
 *   mode: "legacy",
 *   text: string,
 * }} DictionaryBundle */

const PROGRESS_AFTER_COMPRESSED_DOWNLOAD = 0.28;
const PROGRESS_AFTER_DECOMPRESS = 0.62;
const SPLIT_CORE_PROGRESS_END = 0.72;

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function raf() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** @param {Uint8Array[]} chunks */
function mergeUint8Arrays(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
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
    Number(meta?.uncompressedBytes) ||
      Number(meta?.coreUncompressedBytes) ||
      Number(meta?.defsUncompressedBytes) ||
      bytes.length ||
      compressed.length * 4,
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
    Number(meta?.uncompressedBytes) ||
      Number(meta?.coreUncompressedBytes) ||
      Number(meta?.defsUncompressedBytes) ||
      compressed.length * 4,
  );

  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("brotli"));
  const reader = stream.getReader();
  /** @type {Uint8Array[]} */
  const byteChunks = [];
  let decompressed = 0;
  let lastYield = performance.now();

  while (true) {
    if (shouldAbort?.()) throw new Error("词典加载已取消");
    const { done, value } = await reader.read();
    if (done) break;
    byteChunks.push(value);
    decompressed += value.length;
    onProgress?.(clamp01(decompressed / targetBytes));

    const now = performance.now();
    if (now - lastYield >= 16) {
      await raf();
      lastYield = now;
    }
  }
  onProgress?.(1);
  return new TextDecoder().decode(mergeUint8Arrays(byteChunks));
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
 * @param {{ shouldAbort?: () => boolean, onProgress?: (ratio01: number) => void, progressMax?: number }} [options]
 */
export async function fetchDictionaryTextPlain(url, options = {}) {
  const { shouldAbort, onProgress, progressMax = PROGRESS_AFTER_COMPRESSED_DOWNLOAD } = options;
  const res = await fetch(url);
  if (!res.ok) throw new Error("词典加载失败");

  let downloadByteTarget = Number(res.headers.get("Content-Length") || 0) || 0;
  const hasByteEstimate = downloadByteTarget > 0;

  let text = "";
  if (res.body) {
    const reader = res.body.getReader();
    /** @type {Uint8Array[]} */
    const byteChunks = [];
    let received = 0;
    while (true) {
      if (shouldAbort?.()) throw new Error("词典加载已取消");
      const { done, value } = await reader.read();
      if (done) break;
      byteChunks.push(value);
      received += value.length;
      if (hasByteEstimate) {
        if (received > downloadByteTarget) {
          downloadByteTarget = Math.max(downloadByteTarget, Math.ceil(received * 1.12));
        }
        onProgress?.(clamp01(received / downloadByteTarget) * progressMax);
      } else {
        onProgress?.(progressMax * (1 - Math.exp(-received / (4 * 1024 * 1024))));
      }
    }
    text = new TextDecoder().decode(mergeUint8Arrays(byteChunks));
  } else {
    text = await res.text();
    onProgress?.(progressMax * 0.92);
  }

  onProgress?.(progressMax);
  return text;
}

/**
 * @param {DictionaryMeta | null | undefined} meta
 */
function resolveSplitDictionaryFiles(meta) {
  const native = isCapacitorNativePlatform();
  if (native) {
    return {
      coreFile: meta?.nativeCoreFile || "dict.core.jsonl",
      defsFile: meta?.nativeDefsFile || "dict.defs.jsonl",
      compressed: false,
    };
  }
  return {
    coreFile: meta?.coreFile || "dict.core.br",
    defsFile: meta?.defsFile || "dict.defs.br",
    compressed: true,
  };
}

/**
 * @param {string} baseUrl
 * @param {DictionaryMeta | null | undefined} meta
 * @param {string} fileName
 * @param {{ shouldAbort?: () => boolean, bumpLoadProgress: (p: number) => void, progressStart?: number, progressEnd?: number, compressed?: boolean }} options
 */
async function fetchSplitDictionaryPart(baseUrl, meta, fileName, options) {
  const {
    shouldAbort,
    bumpLoadProgress,
    progressStart = 0,
    progressEnd = 1,
    compressed = true,
  } = options;
  const span = progressEnd - progressStart;
  const url = `${baseUrl}${fileName}`;

  if (!compressed) {
    return fetchDictionaryTextPlain(url, {
      shouldAbort,
      progressMax: 1,
      onProgress: (ratio) => {
        bumpLoadProgress(progressStart + ratio * span);
      },
    });
  }

  const partMeta = {
    ...meta,
    uncompressedBytes:
      fileName.includes("core") && meta?.coreUncompressedBytes
        ? meta.coreUncompressedBytes
        : fileName.includes("defs") && meta?.defsUncompressedBytes
          ? meta.defsUncompressedBytes
          : meta?.uncompressedBytes,
  };
  return fetchDictionaryTextFromBrotli(url, partMeta, {
    shouldAbort,
    onDownloadProgress: (ratio) => {
      bumpLoadProgress(progressStart + ratio * span * 0.45);
    },
    onDecompressProgress: (ratio) => {
      bumpLoadProgress(progressStart + span * (0.45 + ratio * 0.55));
    },
  });
}

/**
 * @param {string} baseUrl
 * @param {{ shouldAbort?: () => boolean, bumpLoadProgress: (p: number) => void }} options
 * @returns {Promise<DictionaryBundle>}
 */
export async function resolveDictionaryBundle(baseUrl, options) {
  const { shouldAbort, bumpLoadProgress } = options;
  const base = baseUrl.replace(/\/+$/, "") + "/";
  const native = isCapacitorNativePlatform();

  /** @type {DictionaryMeta | null} */
  let meta = null;
  try {
    const metaRes = await fetch(`${base}dict.meta.json`);
    if (metaRes.ok) meta = await metaRes.json();
  } catch {
    meta = null;
  }

  const legacyLoadOptions = {
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
  };

  const trySplitLoad = async (coreFile, defsFile, compressed) => {
    const coreText = await fetchSplitDictionaryPart(base, meta, coreFile, {
      shouldAbort,
      bumpLoadProgress,
      progressStart: 0,
      progressEnd: SPLIT_CORE_PROGRESS_END,
      compressed,
    });
    if (shouldAbort?.()) throw new Error("词典加载已取消");
    return {
      mode: "split",
      coreText,
      defsUrl: `${base}${defsFile}`,
      defsCompressed: compressed,
      defsMeta: meta,
    };
  };

  if (meta?.split) {
    const files = resolveSplitDictionaryFiles(meta);
    return trySplitLoad(files.coreFile, files.defsFile, files.compressed);
  }

  if (import.meta.env.PROD) {
    const files = resolveSplitDictionaryFiles(meta);
    try {
      return await trySplitLoad(files.coreFile, files.defsFile, files.compressed);
    } catch (e) {
      if (shouldAbort?.()) throw e;
      const msg = String(e?.message ?? "");
      if (msg !== "词典加载失败") throw e;
    }

    if (!native) {
      try {
        const text = await fetchDictionaryTextFromBrotli(`${base}dict.json.br`, meta, legacyLoadOptions);
        return { mode: "legacy", text };
      } catch (e) {
        if (shouldAbort?.()) throw e;
        const msg = String(e?.message ?? "");
        if (msg !== "词典加载失败") throw e;
      }
    }
  }

  if (!native && meta?.format === "brotli") {
    const text = await fetchDictionaryTextFromBrotli(`${base}dict.json.br`, meta, legacyLoadOptions);
    return { mode: "legacy", text };
  }

  const text = await fetchDictionaryTextPlain(`${base}dict.json`, {
    shouldAbort,
    onProgress: (ratio) => bumpLoadProgress(ratio),
  });
  return { mode: "legacy", text };
}

/**
 * @param {string} defsUrl
 * @param {DictionaryMeta | null | undefined} meta
 * @param {{ shouldAbort?: () => boolean, compressed?: boolean }} [options]
 */
export async function fetchDictionaryDefinitionsText(defsUrl, meta, options = {}) {
  const { shouldAbort, compressed = !isCapacitorNativePlatform() } = options;
  if (!compressed) {
    return fetchDictionaryTextPlain(defsUrl, {
      shouldAbort,
      progressMax: 1,
      onProgress: () => {},
    });
  }
  return fetchDictionaryTextFromBrotli(defsUrl, meta, {
    shouldAbort,
    onDownloadProgress: () => {},
    onDecompressProgress: () => {},
  });
}

/** @deprecated 使用 resolveDictionaryBundle */
export async function resolveDictionaryText(baseUrl, options) {
  const bundle = await resolveDictionaryBundle(baseUrl, options);
  if (bundle.mode === "legacy") return bundle.text;
  return bundle.coreText;
}

export {
  PROGRESS_AFTER_COMPRESSED_DOWNLOAD,
  PROGRESS_AFTER_DECOMPRESS,
  SPLIT_CORE_PROGRESS_END,
};
