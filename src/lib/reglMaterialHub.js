/**
 * 全材质共用单一 WebGL 上下文 + 离屏 canvas（192×192）。
 */
import createREGL from "regl";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { MATERIAL_SHADER_MODULES } from "./reglMaterials/index.js";
import {
  anyReglSubscriberAnimated,
  applyReglSubscriberAnimated,
  bindReglSubscriberViewport,
  blitReglOffscreenToSubscriber,
  disposeReglSubscriberBindings,
  executeReglHubDraw,
  findReglSubscriberByCanvas,
  runProfiledMaterialHubTick,
  seedReglSubscriberFromPeers,
} from "./reglSubscriberAnimation.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";
import {
  copyWebglCanvasTo2dScratch,
  getMaterialBlitExperimentMode,
  refreshPlain2dBlitSource,
  resolveBlitSourceCanvas,
} from "./reglMaterialBlitExperiment.js";
import {
  reglDisplayCanvas2dAttributes,
  getMaterialRenderPipeline,
  notifyMaterialRenderingCapabilityChanged,
  reglHubWebglAttributes,
  reglMaterialDisplayDpr,
  reglOffscreenTexPx,
  useDirectVisibleWebglMaterial,
} from "./reglMaterialPerf.js";
import { markMaterialCssFallbackRequired } from "../platform/webViewCapabilities.js";
import { applyMaterialAnimationCapabilityConstraints } from "../settings/materialAnimationAvailability.js";
import {
  attachDirectMaterialRegl,
  setDirectMaterialReglAnimated,
  repaintUnpaintedDirectMaterialCanvasesIn,
  repaintStaticDirectMaterialSubscribers,
} from "./reglDirectMaterialMount.js";
import {
  attachVideoAtlasMaterial,
  setVideoAtlasMaterialAnimated,
} from "./reglMaterialVideoAtlas.js";
import {
  attachBitmapRendererMaterial,
  setBitmapRendererMaterialAnimated,
  repaintUnpaintedBitmapRendererCanvasesIn,
  repaintStaticBitmapRendererSubscribers,
} from "./reglMaterialBitmapRenderer.js";

/** @typedef {import("./reglSubscriberAnimation.js").ReglDisplaySubscriber} ReglDisplaySubscriber */

/** @type {Map<string, Set<ReglDisplaySubscriber>>} */
const subscribersByMaterial = new Map();

/** @type {Map<string, object>} */
const drawByMaterial = new Map();

/**
 * @type {{
 *   offscreen: HTMLCanvasElement,
 *   regl: import("regl").Regl,
 *   texPx: number,
 * } | null}
 */
let sharedHub = null;

let unifiedTickRegistered = false;

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

  try {
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
    return sharedHub;
  } catch (e) {
    markMaterialCssFallbackRequired();
    applyMaterialAnimationCapabilityConstraints();
    notifyMaterialRenderingCapabilityChanged();
    console.warn("[reglMaterialHub] shared hub init failed", e);
    return null;
  }
}

function destroySharedHub() {
  if (!sharedHub) return;
  forceLoseWebglContext(sharedHub.regl, sharedHub.offscreen);
  try {
    sharedHub.regl.destroy();
  } catch {
    // no-op
  }
  sharedHub = null;
  drawByMaterial.clear();
}

function anyMaterialNeedsTick() {
  for (const subs of subscribersByMaterial.values()) {
    if (anyReglSubscriberAnimated(subs)) return true;
  }
  return false;
}

/** @returns {{ texPx: number } | null} */
function hubProfileSnapshot() {
  if (!sharedHub) return null;
  return { texPx: sharedHub.texPx };
}

function drawMaterialFrame(materialId) {
  const hub = sharedHub;
  const draw = drawByMaterial.get(materialId);
  if (!hub || !draw) return;
  const viewport = { x: 0, y: 0, width: hub.texPx, height: hub.texPx };
  executeReglHubDraw(hub.regl, draw, viewport);
}

function resolveMaterialFrameSource(materialId, mode, hub) {
  if (mode === "skip") return null;
  if (mode === "webgl_2d_cache") {
    return copyWebglCanvasTo2dScratch(hub.offscreen, hub.texPx, materialId) ?? hub.offscreen;
  }
  return resolveBlitSourceCanvas(mode, hub);
}

function blitMaterialSubscriber(materialId, sub, sourceOverride = undefined) {
  const hub = sharedHub;
  if (!hub) return;
  const mode = getMaterialBlitExperimentMode();
  if (mode === "skip") return;
  const source = sourceOverride ?? resolveMaterialFrameSource(materialId, mode, hub);
  if (!source) return;
  blitReglOffscreenToSubscriber(sub, source, hub.texPx, {
    wildcardBlur: (mode === "webgl" || mode === "webgl_2d_cache") && materialId === "wildcard",
  });
}

function paintMaterialSubscriberOnce(materialId, sub) {
  ensureSharedHub();
  drawMaterialFrame(materialId);
  const hub = sharedHub;
  if (!hub) return;
  const mode = getMaterialBlitExperimentMode();
  const source = resolveMaterialFrameSource(materialId, mode, hub);
  blitMaterialSubscriber(materialId, sub, source);
}

function materialHubControlsFor(materialId) {
  return {
    paintSubscriberOnce: (sub) => paintMaterialSubscriberOnce(materialId, sub),
    ensureTick: ensureUnifiedMaterialTick,
    stopTickIfIdle: stopUnifiedMaterialTickIfIdle,
  };
}

function unifiedMaterialHubTick() {
  const hub = sharedHub;
  if (!hub) return;

  if (getMaterialBlitExperimentMode() === "2d_source") {
    refreshPlain2dBlitSource(hub.texPx);
  }

  for (const mod of MATERIAL_SHADER_MODULES) {
    const materialId = mod.MATERIAL_ID;
    const subs = subscribersByMaterial.get(materialId);
    if (!subs) continue;
    runProfiledMaterialHubTick(
      materialId,
      subs,
      hubProfileSnapshot(),
      () => drawMaterialFrame(materialId),
      (sub, source) => blitMaterialSubscriber(materialId, sub, source),
      () => resolveMaterialFrameSource(materialId, getMaterialBlitExperimentMode(), hub),
    );
  }
}

function ensureUnifiedMaterialTick() {
  if (unifiedTickRegistered) return;
  unifiedTickRegistered = true;
  materialHubSubscribeTick(unifiedMaterialHubTick);
}

function stopUnifiedMaterialTickIfIdle() {
  if (anyMaterialNeedsTick()) return;
  if (unifiedTickRegistered) {
    materialHubUnsubscribeTick(unifiedMaterialHubTick);
    unifiedTickRegistered = false;
  }
}

function teardownSharedHubForHmr() {
  if (unifiedTickRegistered) {
    materialHubUnsubscribeTick(unifiedMaterialHubTick);
    unifiedTickRegistered = false;
  }
  subscribersByMaterial.clear();
  destroySharedHub();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownSharedHubForHmr();
  });
}

/**
 * @param {string} materialId
 * @param {HTMLCanvasElement} canvas
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean, seedFromPeers?: boolean }} [options]
 * @returns {() => void}
 */
export function attachMaterialRegl(materialId, canvas, options = {}) {
  const pipeline = getMaterialRenderPipeline();

  if (pipeline === "video_atlas" && options.animated !== false) {
    try {
      return attachVideoAtlasMaterial(materialId, canvas, options);
    } catch (e) {
      console.warn("[reglMaterialHub] video atlas material failed, falling back to blit", e);
    }
  }

  if (pipeline === "bitmaprenderer") {
    try {
      return attachBitmapRendererMaterial(materialId, canvas, options);
    } catch (e) {
      console.warn("[reglMaterialHub] bitmaprenderer material failed, falling back to blit", e);
    }
  }

  if (useDirectVisibleWebglMaterial() && options.animated !== false) {
    try {
      return attachDirectMaterialRegl(materialId, canvas, options);
    } catch (e) {
      console.warn("[reglMaterialHub] direct WebGL material failed, falling back to blit", e);
    }
  }

  const dpr = reglMaterialDisplayDpr();
  const fixedW = options.fixedCssWidth;
  const fixedH = options.fixedCssHeight;
  const useFixedLayout =
    typeof fixedW === "number" &&
    typeof fixedH === "number" &&
    Number.isFinite(fixedW) &&
    Number.isFinite(fixedH) &&
    fixedW > 0 &&
    fixedH > 0;
  const animated = options.animated !== false;

  const ctx = canvas.getContext("2d", reglDisplayCanvas2dAttributes());
  if (!ctx) return () => {};

  /** @type {ReglDisplaySubscriber} */
  const sub = {
    canvas,
    ctx,
    dpr,
    fixedCssWidth: useFixedLayout ? fixedW : undefined,
    fixedCssHeight: useFixedLayout ? fixedH : undefined,
    animated,
    _displayFrameReady: false,
  };

  const subs = ensureSubscribersSet(materialId);
  bindReglSubscriberViewport(
    sub,
    (s) => {
      if (s.frameFrozen) return;
      paintMaterialSubscriberOnce(materialId, s);
    },
    () => {
      if (animated) ensureUnifiedMaterialTick();
    },
  );
  ensureSharedHub();
  subs.add(sub);

  if (animated) {
    ensureUnifiedMaterialTick();
    const seeded =
      options.seedFromPeers === true && seedReglSubscriberFromPeers(sub, subs);
    if (!seeded) {
      paintMaterialSubscriberOnce(materialId, sub);
    }
  } else {
    paintMaterialSubscriberOnce(materialId, sub);
    sub.frameFrozen = true;
  }

  return function disposeMaterialRegl() {
    disposeReglSubscriberBindings(sub);
    subs.delete(sub);
    stopUnifiedMaterialTickIfIdle();
  };
}

/** @param {string} materialId @param {HTMLCanvasElement} canvas @param {boolean} animated */
export function setMaterialReglAnimated(materialId, canvas, animated) {
  if (setVideoAtlasMaterialAnimated(materialId, canvas, animated)) return;
  if (setBitmapRendererMaterialAnimated(materialId, canvas, animated)) return;
  if (setDirectMaterialReglAnimated(materialId, canvas, animated)) return;

  const subs = subscribersByMaterial.get(materialId);
  if (!subs) return;
  const sub = findReglSubscriberByCanvas(subs, canvas);
  if (!sub) return;
  applyReglSubscriberAnimated(sub, animated, materialHubControlsFor(materialId));
}

/** 补绘容器内尚未成功贴图的材质 canvas（如字母库大量静态万能块）。 */
export function repaintUnpaintedMaterialCanvasesIn(root) {
  if (!(root instanceof HTMLElement)) return;
  for (const [materialId, subs] of subscribersByMaterial) {
    for (const sub of subs) {
      if (sub._displayFrameReady || !root.contains(sub.canvas)) continue;
      paintMaterialSubscriberOnce(materialId, sub);
    }
  }
  repaintUnpaintedBitmapRendererCanvasesIn(root);
  repaintUnpaintedDirectMaterialCanvasesIn(root);
}

function repaintStaticBlitSubscribers() {
  if (!sharedHub) return;
  for (const [materialId, subs] of subscribersByMaterial) {
    for (const sub of subs) {
      if (sub.animated !== false) continue;
      paintMaterialSubscriberOnce(materialId, sub);
      sub.frameFrozen = true;
    }
  }
}

/** 关闭材质动画后，用统一静帧时刻重绘全部静态 subscriber（各渲染管线）。 */
export function repaintAllStaticMaterialCanvases() {
  repaintStaticBlitSubscribers();
  repaintStaticBitmapRendererSubscribers();
  repaintStaticDirectMaterialSubscribers();
}

/** 预创建共享 WebGL、编译全部材质 shader，并各绘 1 帧（含 blit 读回路径）。 */
export function warmupSharedReglMaterialHub() {
  ensureSharedHub();
  const hub = sharedHub;
  if (!hub) return;
  for (const mod of MATERIAL_SHADER_MODULES) {
    drawMaterialFrame(mod.MATERIAL_ID);
  }
  try {
    const mode = getMaterialBlitExperimentMode();
    if (mode === "skip") return;
    if (mode === "2d_source") {
      refreshPlain2dBlitSource(hub.texPx);
    }
    const canvas = document.createElement("canvas");
    canvas.width = hub.texPx;
    canvas.height = hub.texPx;
    const ctx = canvas.getContext("2d", reglDisplayCanvas2dAttributes());
    if (!ctx) return;
    for (const mod of MATERIAL_SHADER_MODULES) {
      const source = resolveMaterialFrameSource(mod.MATERIAL_ID, mode, hub);
      if (!source) continue;
      ctx.drawImage(source, 0, 0, hub.texPx, hub.texPx, 0, 0, hub.texPx, hub.texPx);
    }
  } catch (e) {
    console.warn("[reglMaterialHub] blit warmup failed", e);
  }
}
