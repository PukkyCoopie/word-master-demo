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
  reglHubWebglAttributes,
  reglMaterialDisplayDpr,
  reglOffscreenTexPx,
  useDirectVisibleWebglMaterial,
} from "./reglMaterialPerf.js";
import {
  attachDirectMaterialRegl,
  setDirectMaterialReglAnimated,
} from "./reglDirectMaterialMount.js";
import {
  attachVideoAtlasMaterial,
  setVideoAtlasMaterialAnimated,
} from "./reglMaterialVideoAtlas.js";
import {
  attachBitmapRendererMaterial,
  setBitmapRendererMaterialAnimated,
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
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options]
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
  };

  const subs = ensureSubscribersSet(materialId);
  bindReglSubscriberViewport(sub, (s) => paintMaterialSubscriberOnce(materialId, s));
  ensureSharedHub();
  subs.add(sub);

  if (animated) {
    ensureUnifiedMaterialTick();
  }
  paintMaterialSubscriberOnce(materialId, sub);

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

/** 预创建共享 WebGL 并编译全部材质 shader */
export function warmupSharedReglMaterialHub() {
  ensureSharedHub();
  for (const mod of MATERIAL_SHADER_MODULES) {
    drawMaterialFrame(mod.MATERIAL_ID);
  }
}
