import createREGL from "regl";
import { shouldFreezeMaterialHubTicks } from "../game/gamePause.js";
import { isMaterialBenchEnabled } from "../dev/materialBenchGate.js";
import { materialHubSubscribeTick, materialHubUnsubscribeTick } from "./reglMaterialTicker.js";
import { MATERIAL_SHADER_MODULES } from "./reglMaterials/index.js";
import { forceLoseWebglContext } from "./reglDebugLog.js";
import { reglOffscreenTexPx } from "./reglMaterialPerf.js";

const shaderModuleByMaterial = new Map(MATERIAL_SHADER_MODULES.map((mod) => [mod.MATERIAL_ID, mod]));

/** @type {Set<{ materialId: string, canvas: HTMLCanvasElement, regl: import("regl").Regl, draw: object, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number, animated: boolean, viewportVisible: boolean, disposeBindings: () => void }>} */
const directSubscribers = new Set();

let directTickRegistered = false;

function shouldDrawDirectSubscriber(sub) {
  if (sub.animated === false) return false;
  if (sub.viewportVisible === false) return false;
  return true;
}

function anyDirectSubscriberNeedsTick() {
  for (const sub of directSubscribers) {
    if (shouldDrawDirectSubscriber(sub)) return true;
  }
  return false;
}

function cssSizeFor(sub) {
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
  return { cssW, cssH };
}

function drawDirectSubscriber(sub) {
  const { cssW, cssH } = cssSizeFor(sub);
  if (cssW <= 0 || cssH <= 0) return;
  const texPx = reglOffscreenTexPx();
  const pw = texPx;
  const ph = texPx;
  if (sub.canvas.width !== pw || sub.canvas.height !== ph) {
    sub.canvas.width = pw;
    sub.canvas.height = ph;
  }
  const viewport = { x: 0, y: 0, width: pw, height: ph };
  sub.regl.poll();
  sub.draw({ viewport });
  sub._displayFrameReady = true;
}

function directMaterialTick() {
  if (document.hidden || directSubscribers.size === 0) return;
  if (shouldFreezeMaterialHubTicks() && !isMaterialBenchEnabled()) return;
  for (const sub of directSubscribers) {
    if (!shouldDrawDirectSubscriber(sub)) continue;
    drawDirectSubscriber(sub);
  }
}

function ensureDirectTick() {
  if (directTickRegistered) return;
  directTickRegistered = true;
  materialHubSubscribeTick(directMaterialTick);
}

function stopDirectTickIfIdle() {
  if (anyDirectSubscriberNeedsTick()) return;
  if (!directTickRegistered) return;
  materialHubUnsubscribeTick(directMaterialTick);
  directTickRegistered = false;
}

function bindDirectViewport(sub) {
  const cleanups = [];

  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver((entries) => {
      sub.viewportVisible = entries.some((e) => e.isIntersecting);
    }, { threshold: 0 });
    io.observe(sub.canvas);
    cleanups.push(() => io.disconnect());
  }

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (!sub._displayFrameReady || sub.animated !== false) drawDirectSubscriber(sub);
    });
    ro.observe(sub.canvas);
    cleanups.push(() => ro.disconnect());
  }

  sub.disposeBindings = () => {
    for (const fn of cleanups) fn();
  };
}

export function repaintUnpaintedDirectMaterialCanvasesIn(root) {
  if (!(root instanceof HTMLElement)) return;
  for (const sub of directSubscribers) {
    if (sub._displayFrameReady || !root.contains(sub.canvas)) continue;
    drawDirectSubscriber(sub);
  }
}

/**
 * @param {string} materialId
 * @param {HTMLCanvasElement} canvas
 * @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options]
 * @returns {() => void}
 */
export function attachDirectMaterialRegl(materialId, canvas, options = {}) {
  const mod = shaderModuleByMaterial.get(materialId);
  if (!mod) return () => {};

  const regl = createREGL({
    canvas,
    attributes: {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    },
  });
  const sub = {
    materialId,
    canvas,
    regl,
    draw: mod.createDraw(regl),
    dpr: 1,
    fixedCssWidth: options.fixedCssWidth,
    fixedCssHeight: options.fixedCssHeight,
    animated: options.animated !== false,
    viewportVisible: true,
    _displayFrameReady: false,
    disposeBindings: () => {},
  };

  bindDirectViewport(sub);
  directSubscribers.add(sub);
  drawDirectSubscriber(sub);
  if (sub.animated) ensureDirectTick();

  return function disposeDirectMaterialRegl() {
    sub.disposeBindings();
    directSubscribers.delete(sub);
    stopDirectTickIfIdle();
    forceLoseWebglContext(sub.regl, sub.canvas);
    try {
      sub.regl.destroy();
    } catch {
      // no-op
    }
  };
}

/**
 * @param {string} materialId
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} animated
 * @returns {boolean}
 */
export function setDirectMaterialReglAnimated(materialId, canvas, animated) {
  for (const sub of directSubscribers) {
    if (sub.materialId !== materialId || sub.canvas !== canvas) continue;
    if (sub.animated === animated) return true;
    sub.animated = animated;
    if (animated) {
      drawDirectSubscriber(sub);
      ensureDirectTick();
    } else {
      drawDirectSubscriber(sub);
    }
    stopDirectTickIfIdle();
    return true;
  }
  return false;
}

/** 关闭材质动画后，用统一静帧时刻重绘全部 direct WebGL 静态 subscriber。 */
export function repaintStaticDirectMaterialSubscribers() {
  for (const sub of directSubscribers) {
    if (sub.animated !== false) continue;
    drawDirectSubscriber(sub);
  }
}

/** 离屏单上下文预编译全部材质 shader 并各绘 1 帧。 */
export function warmupDirectMaterialShaders() {
  const texPx = reglOffscreenTexPx();
  const canvas = document.createElement("canvas");
  canvas.width = texPx;
  canvas.height = texPx;
  const regl = createREGL({
    canvas,
    attributes: {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: false,
    },
  });
  const viewport = { x: 0, y: 0, width: texPx, height: texPx };
  for (const mod of MATERIAL_SHADER_MODULES) {
    const draw = mod.createDraw(regl);
    regl.poll();
    draw({ viewport });
  }
  forceLoseWebglContext(regl, canvas);
  try {
    regl.destroy();
  } catch {
    // no-op
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (directTickRegistered) {
      materialHubUnsubscribeTick(directMaterialTick);
      directTickRegistered = false;
    }
    for (const sub of directSubscribers) {
      sub.disposeBindings();
      forceLoseWebglContext(sub.regl, sub.canvas);
      try {
        sub.regl.destroy();
      } catch {
        // no-op
      }
    }
    directSubscribers.clear();
  });
}
