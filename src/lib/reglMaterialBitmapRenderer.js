import createREGL from "regl";
import { isGamePaused } from "../game/gamePause.js";
import { isMaterialBenchEnabled } from "../dev/materialBenchGate.js";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";
import { MATERIAL_SHADER_MODULES } from "./reglMaterials/index.js";
import {
  reglBlitImageSmoothingQuality,
  reglHubWebglAttributes,
  reglMaterialDisplayDpr,
  reglOffscreenTexPx,
  useBitmapRendererDisplayResize,
} from "./reglMaterialPerf.js";
import { executeReglHubDraw } from "./reglSubscriberAnimation.js";

/** @type {Map<string, Set<{ materialId: string, canvas: HTMLCanvasElement, ctx: ImageBitmapRenderingContext, animated: boolean, viewportVisible: boolean, pending: boolean, disposed: boolean, fixedCssWidth?: number, fixedCssHeight?: number, disposeBindings: () => void }>>} */
const subscribersByMaterial = new Map();
/** @type {Map<string, object>} */
const drawByMaterial = new Map();

/** @type {{ offscreen: HTMLCanvasElement, regl: import("regl").Regl, texPx: number } | null} */
let sharedHub = null;
let tickRegistered = false;

function ensureSubscribersSet(materialId) {
  let set = subscribersByMaterial.get(materialId);
  if (!set) {
    set = new Set();
    subscribersByMaterial.set(materialId, set);
  }
  return set;
}

function ensureSharedHub() {
  if (sharedHub) return sharedHub;
  if (typeof createImageBitmap !== "function") {
    throw new Error("createImageBitmap is unavailable");
  }
  const texPx = reglOffscreenTexPx();
  const offscreen = document.createElement("canvas");
  offscreen.width = texPx;
  offscreen.height = texPx;
  const regl = createREGL({
    canvas: offscreen,
    attributes: reglHubWebglAttributes(),
  });
  for (const mod of MATERIAL_SHADER_MODULES) {
    drawByMaterial.set(mod.MATERIAL_ID, mod.createDraw(regl));
  }
  sharedHub = { offscreen, regl, texPx };
  publishBitmapRendererStats();
  return sharedHub;
}

function destroySharedHubIfIdle() {
  for (const subs of subscribersByMaterial.values()) {
    if (subs.size > 0) return;
  }
  if (!sharedHub) return;
  forceLoseWebglContext(sharedHub.regl, sharedHub.offscreen);
  try {
    sharedHub.regl.destroy();
  } catch {
    // no-op
  }
  sharedHub = null;
  drawByMaterial.clear();
  publishBitmapRendererStats();
}

function drawMaterialFrame(materialId) {
  const hub = sharedHub;
  const draw = drawByMaterial.get(materialId);
  if (!hub || !draw) return;
  executeReglHubDraw(hub.regl, draw, {
    x: 0,
    y: 0,
    width: hub.texPx,
    height: hub.texPx,
  });
}

function shouldReceiveFrames(sub) {
  if (sub.animated === false) return false;
  if (sub.viewportVisible === false) return false;
  return true;
}

function anySubscriberNeedsTick() {
  for (const subs of subscribersByMaterial.values()) {
    for (const sub of subs) {
      if (shouldReceiveFrames(sub)) return true;
    }
  }
  return false;
}

function resolveDisplaySize(sub) {
  if (!useBitmapRendererDisplayResize()) {
    const texPx = sharedHub?.texPx ?? reglOffscreenTexPx();
    return { width: texPx, height: texPx };
  }
  let cssW = sub.canvas.clientWidth;
  let cssH = sub.canvas.clientHeight;
  if (
    typeof sub.fixedCssWidth === "number" &&
    typeof sub.fixedCssHeight === "number" &&
    Number.isFinite(sub.fixedCssWidth) &&
    Number.isFinite(sub.fixedCssHeight) &&
    sub.fixedCssWidth > 0 &&
    sub.fixedCssHeight > 0
  ) {
    cssW = sub.fixedCssWidth;
    cssH = sub.fixedCssHeight;
  }
  if (cssW <= 0 || cssH <= 0) return null;
  const dpr = reglMaterialDisplayDpr();
  return {
    width: Math.max(2, Math.ceil(cssW * dpr)),
    height: Math.max(2, Math.ceil(cssH * dpr)),
  };
}

function ensureCanvasBuffer(sub, size) {
  if (sub.canvas.width !== size.width || sub.canvas.height !== size.height) {
    sub.canvas.width = size.width;
    sub.canvas.height = size.height;
  }
}

function publishBitmapRendererStats() {
  try {
    let subscribers = 0;
    let visible = 0;
    let pending = 0;
    for (const subs of subscribersByMaterial.values()) {
      subscribers += subs.size;
      for (const sub of subs) {
        if (sub.viewportVisible !== false) visible += 1;
        if (sub.pending) pending += 1;
      }
    }
    globalThis.__WM_MATERIAL_PIPELINE_STATS__ = {
      type: "bitmaprenderer",
      contexts: sharedHub ? 1 : 0,
      subscribers,
      visible,
      pending,
      source: sharedHub ? [sharedHub.offscreen.width, sharedHub.offscreen.height] : null,
    };
  } catch {
    // no-op
  }
}

async function transferFrameToSubscriber(sub) {
  const hub = sharedHub;
  if (!hub || sub.pending || sub.disposed) return;
  const size = resolveDisplaySize(sub);
  if (!size) return;
  ensureCanvasBuffer(sub, size);
  sub.pending = true;
  publishBitmapRendererStats();
  try {
    const bmp = await createImageBitmap(hub.offscreen, 0, 0, hub.texPx, hub.texPx, {
      resizeWidth: size.width,
      resizeHeight: size.height,
      resizeQuality: reglBlitImageSmoothingQuality(),
    });
    if (sub.disposed) {
      bmp.close?.();
      return;
    }
    sub.ctx.transferFromImageBitmap(bmp);
  } catch (e) {
    console.warn("[reglMaterialBitmapRenderer] transfer failed", e);
  } finally {
    sub.pending = false;
    publishBitmapRendererStats();
  }
}

function paintMaterialSubscribers(materialId, includeStatic = false) {
  const hub = sharedHub;
  const subs = subscribersByMaterial.get(materialId);
  if (!hub || !subs || subs.size === 0) return;
  drawMaterialFrame(materialId);
  for (const sub of subs) {
    if (includeStatic) {
      if (sub.viewportVisible === false) continue;
    } else if (!shouldReceiveFrames(sub)) {
      continue;
    }
    void transferFrameToSubscriber(sub);
  }
}

function bitmapRendererTick() {
  if (document.hidden || !sharedHub || !anySubscriberNeedsTick()) return;
  if (isGamePaused() && !isMaterialBenchEnabled()) return;
  for (const mod of MATERIAL_SHADER_MODULES) {
    paintMaterialSubscribers(mod.MATERIAL_ID);
  }
}

function ensureTick() {
  if (tickRegistered) return;
  tickRegistered = true;
  materialHubSubscribeTick(bitmapRendererTick);
}

function stopTickIfIdle() {
  if (anySubscriberNeedsTick()) return;
  if (!tickRegistered) return;
  materialHubUnsubscribeTick(bitmapRendererTick);
  tickRegistered = false;
}

function bindBitmapVisibility(sub) {
  const cleanups = [];
  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver((entries) => {
      sub.viewportVisible = entries.some((e) => e.isIntersecting);
      if (sub.viewportVisible && sub.animated) ensureTick();
      stopTickIfIdle();
      publishBitmapRendererStats();
    }, { threshold: 0 });
    io.observe(sub.canvas);
    cleanups.push(() => io.disconnect());
  }
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (!sub.disposed) paintMaterialSubscribers(sub.materialId, true);
    });
    ro.observe(sub.canvas);
    cleanups.push(() => ro.disconnect());
  }
  sub.disposeBindings = () => {
    for (const fn of cleanups) fn();
  };
}

/**
 * @param {string} materialId
 * @param {HTMLCanvasElement} canvas
 * @param {{ animated?: boolean }} [options]
 * @returns {() => void}
 */
export function attachBitmapRendererMaterial(materialId, canvas, options = {}) {
  ensureSharedHub();
  const ctx = canvas.getContext("bitmaprenderer");
  if (!ctx) {
    throw new Error("bitmaprenderer context is unavailable");
  }
  const sub = {
    materialId,
    canvas,
    ctx,
    animated: options.animated !== false,
    viewportVisible: true,
    pending: false,
    disposed: false,
    fixedCssWidth: options.fixedCssWidth,
    fixedCssHeight: options.fixedCssHeight,
    disposeBindings: () => {},
  };
  bindBitmapVisibility(sub);
  ensureSubscribersSet(materialId).add(sub);
  paintMaterialSubscribers(materialId, true);
  if (sub.animated) ensureTick();
  publishBitmapRendererStats();

  return function disposeBitmapRendererMaterial() {
    sub.disposed = true;
    sub.disposeBindings();
    subscribersByMaterial.get(materialId)?.delete(sub);
    stopTickIfIdle();
    destroySharedHubIfIdle();
    publishBitmapRendererStats();
  };
}

/**
 * @param {string} materialId
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} animated
 * @returns {boolean}
 */
export function setBitmapRendererMaterialAnimated(materialId, canvas, animated) {
  const subs = subscribersByMaterial.get(materialId);
  if (!subs) return false;
  for (const sub of subs) {
    if (sub.canvas !== canvas) continue;
    sub.animated = animated;
    if (animated) ensureTick();
    else paintMaterialSubscribers(materialId, true);
    stopTickIfIdle();
    publishBitmapRendererStats();
    return true;
  }
  return false;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (tickRegistered) {
      materialHubUnsubscribeTick(bitmapRendererTick);
      tickRegistered = false;
    }
    for (const subs of subscribersByMaterial.values()) {
      for (const sub of subs) {
        sub.disposed = true;
        sub.disposeBindings();
      }
    }
    subscribersByMaterial.clear();
    destroySharedHubIfIdle();
  });
}
