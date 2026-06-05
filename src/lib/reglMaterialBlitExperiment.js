/**
 * 材质 blit 性能实验：对比 WebGL canvas 源 vs 纯 2D canvas 源 vs readPixels 中转。
 */

/** @typedef {'webgl' | 'webgl_2d_cache' | 'skip' | '2d_source' | 'readpixels_2d'} MaterialBlitExperimentMode */

/** @returns {MaterialBlitExperimentMode} */
export function getMaterialBlitExperimentMode() {
  try {
    const o = globalThis.__WM_BLIT_EXPERIMENT__;
    if (o === "webgl" || o === "webgl_2d_cache" || o === "skip" || o === "2d_source" || o === "readpixels_2d") {
      return o;
    }
  } catch {
    // no-op
  }
  const built = import.meta.env.VITE_BLIT_EXPERIMENT;
  if (built === "A" || built === "2d_source") return "2d_source";
  if (built === "C" || built === "webgl_2d_cache") return "webgl_2d_cache";
  if (built === "B" || built === "readpixels_2d") return "readpixels_2d";
  if (built === "skip") return "skip";
  return "webgl";
}

/** @type {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, texPx: number } | null} */
let plain2dScratch = null;

/** @type {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, texPx: number } | null} */
let readPixelsScratch = null;

/** @type {Map<string, { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, texPx: number }>} */
const webgl2dScratchByKey = new Map();

/**
 * @param {number} texPx
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
 */
function ensurePlain2dScratch(texPx) {
  if (plain2dScratch && plain2dScratch.texPx === texPx) {
    return plain2dScratch;
  }
  const canvas = document.createElement("canvas");
  canvas.width = texPx;
  canvas.height = texPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("plain2d scratch unavailable");
  plain2dScratch = { canvas, ctx, texPx };
  return plain2dScratch;
}

/**
 * @param {number} texPx
 * @returns {{ canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D }}
 */
function ensureReadPixelsScratch(texPx) {
  if (readPixelsScratch && readPixelsScratch.texPx === texPx) {
    return readPixelsScratch;
  }
  const canvas = document.createElement("canvas");
  canvas.width = texPx;
  canvas.height = texPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("readPixels scratch unavailable");
  readPixelsScratch = { canvas, ctx, texPx };
  return readPixelsScratch;
}

/**
 * Cache the current WebGL canvas frame into a same-size 2D canvas once per material/frame.
 * This preserves the shader pixels while avoiding WebGL->2D synchronization for every subscriber.
 * @param {HTMLCanvasElement} source
 * @param {number} texPx
 * @param {string} key
 * @returns {HTMLCanvasElement | null}
 */
export function copyWebglCanvasTo2dScratch(source, texPx, key) {
  const scratchKey = String(key || "default");
  let entry = webgl2dScratchByKey.get(scratchKey);
  if (!entry || entry.texPx !== texPx) {
    const canvas = document.createElement("canvas");
    canvas.width = texPx;
    canvas.height = texPx;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;
    entry = { canvas, ctx, texPx };
    webgl2dScratchByKey.set(scratchKey, entry);
  }
  entry.ctx.globalCompositeOperation = "copy";
  entry.ctx.drawImage(source, 0, 0, texPx, texPx, 0, 0, texPx, texPx);
  entry.ctx.globalCompositeOperation = "source-over";
  return entry.canvas;
}

/** 实验 A：用普通 2D canvas 动画图案作 drawImage 源（与 WebGL 无关） */
export function refreshPlain2dBlitSource(texPx) {
  const { canvas, ctx } = ensurePlain2dScratch(texPx);
  const t = performance.now() * 0.001;
  const g = ctx.createLinearGradient(0, 0, texPx, texPx);
  g.addColorStop(0, `hsl(${(t * 40) % 360}, 70%, 45%)`);
  g.addColorStop(1, `hsl(${(t * 40 + 120) % 360}, 70%, 55%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, texPx, texPx);
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(
    (Math.sin(t) * 0.5 + 0.5) * texPx * 0.2,
    (Math.cos(t * 0.7) * 0.5 + 0.5) * texPx * 0.2,
    texPx * 0.35,
    texPx * 0.35,
  );
  return canvas;
}

/**
 * 实验 B：WebGL 帧绘制后 readPixels → 2D scratch，再作为 drawImage 源。
 * @param {import('regl').Regl} regl
 * @param {number} texPx
 * @returns {HTMLCanvasElement | null}
 */
export function copyWebglFrameTo2dScratch(regl, texPx) {
  const gl = regl?._gl;
  if (!gl) return null;
  const { canvas, ctx } = ensureReadPixelsScratch(texPx);
  const w = texPx;
  const h = texPx;
  const pixels = new Uint8ClampedArray(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  // WebGL 原点在左下；翻转到 2D ImageData（左上）
  const rowBytes = w * 4;
  const flipped = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < h; y++) {
    const src = (h - 1 - y) * rowBytes;
    flipped.set(pixels.subarray(src, src + rowBytes), y * rowBytes);
  }
  ctx.putImageData(new ImageData(flipped, w, h), 0, 0);
  return canvas;
}

/**
 * @param {MaterialBlitExperimentMode} mode
 * @param {{
 *   offscreen: HTMLCanvasElement,
 *   regl: import('regl').Regl,
 *   texPx: number,
 * }} hub
 * @returns {HTMLCanvasElement | null}
 */
export function resolveBlitSourceCanvas(mode, hub) {
  if (mode === "2d_source") {
    return refreshPlain2dBlitSource(hub.texPx);
  }
  if (mode === "readpixels_2d") {
    return copyWebglFrameTo2dScratch(hub.regl, hub.texPx) ?? hub.offscreen;
  }
  return hub.offscreen;
}
