/**
 * WebView / 浏览器运行时能力探测（启动时同步执行一次）。
 * 供材质管线、彩纸、设置项与 boot 门槛共用。
 */

export const MIN_WEBVIEW_CHROME_MAJOR = 70;

let initialized = false;

/** @type {boolean} */
let meetsMinimumWebView = true;
/** @type {boolean} */
let webglAvailable = false;
/** @type {boolean} */
let supportsBitmapRendererPipeline = false;
/** @type {boolean} */
let supportsMaterialAnimation = false;
/** @type {boolean} */
let supportsConfettiWorker = false;
/** @type {boolean} */
let requiresMaterialCssFallback = false;

/** CSS 回退标记变更时 bump，供 LetterTile 等重渲染 */
export const materialCssFallbackSignal = { value: 0 };

/**
 * @param {string} ua
 * @returns {number | null}
 */
export function parseChromeMajorFromUserAgent(ua) {
  const match = String(ua || "").match(/Chrom(?:e|ium)\/(\d+)/);
  if (!match) return null;
  const major = Number.parseInt(match[1], 10);
  return Number.isFinite(major) ? major : null;
}

/** @returns {boolean} */
export function detectWebglAvailable() {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

/** @returns {boolean} */
export function detectBitmapRendererPipelineSupport() {
  if (typeof document === "undefined") return false;
  if (typeof createImageBitmap !== "function") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("bitmaprenderer");
  } catch {
    return false;
  }
}

function recomputeSupportsMaterialAnimation() {
  supportsMaterialAnimation =
    !requiresMaterialCssFallback &&
    webglAvailable &&
    supportsBitmapRendererPipeline;
}

/** WebGL / regl 不可用时切换为 CSS 纯色材质回退 */
export function markMaterialCssFallbackRequired() {
  if (requiresMaterialCssFallback) return;
  requiresMaterialCssFallback = true;
  webglAvailable = false;
  recomputeSupportsMaterialAnimation();
  materialCssFallbackSignal.value += 1;
}

/** 启动时调用；重复调用无副作用 */
export function initWebViewCapabilities() {
  if (initialized) return;
  initialized = true;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : "";
  const chromeMajor = parseChromeMajorFromUserAgent(ua);
  meetsMinimumWebView =
    chromeMajor == null || chromeMajor >= MIN_WEBVIEW_CHROME_MAJOR;

  webglAvailable = detectWebglAvailable();
  supportsBitmapRendererPipeline = detectBitmapRendererPipelineSupport();
  supportsConfettiWorker = typeof OffscreenCanvas !== "undefined";
  recomputeSupportsMaterialAnimation();
}

export function getMeetsMinimumWebView() {
  return meetsMinimumWebView;
}

export function getWebglAvailable() {
  return webglAvailable;
}

export function getSupportsBitmapRendererPipeline() {
  return supportsBitmapRendererPipeline;
}

export function getSupportsMaterialAnimation() {
  return supportsMaterialAnimation;
}

export function getSupportsConfettiWorker() {
  return supportsConfettiWorker;
}

export function getRequiresMaterialCssFallback() {
  return requiresMaterialCssFallback;
}
