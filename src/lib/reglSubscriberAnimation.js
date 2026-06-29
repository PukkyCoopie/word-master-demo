import { getMaterialBlitExperimentMode } from "./reglMaterialBlitExperiment.js";
import {
  reglBlitImageSmoothingQuality,
  useMobileMaterialLowPower,
} from "./reglMaterialPerf.js";
import { isMaterialProfilerEnabled, recordMaterialHubProfile } from "./reglMaterialProfiler.js";

/**
 * regl 材质展示 canvas 的「逐帧 / 单帧」订阅控制。
 * 未展开牌库 stack 等场景只需绘制一帧并保留，避免大量 canvas 共用 RAF。
 */

/** @typedef {{ animated?: boolean, viewportVisible?: boolean, frameFrozen?: boolean, _displayFrameReady?: boolean, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number, _disposeReglBindings?: (() => void) | null }} ReglDisplaySubscriber */

/**
 * @param {ReglDisplaySubscriber} sub
 * @returns {boolean}
 */
export function shouldReglSubscriberReceiveFrames(sub) {
  if (sub.animated === false) return false;
  if (sub.viewportVisible === false) return false;
  return true;
}

/**
 * @param {Iterable<ReglDisplaySubscriber>} subscribers
 */
export function anyReglSubscriberAnimated(subscribers) {
  for (const sub of subscribers) {
    if (shouldReglSubscriberReceiveFrames(sub)) return true;
  }
  return false;
}

/**
 * @param {object} regl
 * @param {object} draw
 * @param {{ x: number, y: number, width: number, height: number }} viewport
 */
export function executeReglHubDraw(regl, draw, viewport) {
  regl.poll();
  draw({ viewport });
  if (!useMobileMaterialLowPower()) {
    try {
      regl._gl?.flush?.();
    } catch {
      // no-op
    }
  }
}

/**
 * @param {ReglDisplaySubscriber} sub
 * @param {HTMLCanvasElement} offscreen WebGL 离屏或 FBO 读回后的 scratch 2D canvas
 * @param {number} texPx
 * @param {{ wildcardBlur?: boolean }} [opts]
 */
export function blitReglOffscreenToSubscriber(sub, offscreen, texPx, opts = {}) {
  let cssW = sub.canvas.clientWidth;
  let cssH = sub.canvas.clientHeight;
  const useFixed =
    typeof sub.fixedCssWidth === "number" &&
    typeof sub.fixedCssHeight === "number" &&
    Number.isFinite(sub.fixedCssWidth) &&
    Number.isFinite(sub.fixedCssHeight) &&
    sub.fixedCssWidth > 0 &&
    sub.fixedCssHeight > 0;
  if (useFixed) {
    cssW = sub.fixedCssWidth;
    cssH = sub.fixedCssHeight;
  }
  if (cssW <= 0 || cssH <= 0) return;
  const pw = Math.max(2, Math.ceil(cssW * sub.dpr));
  const ph = Math.max(2, Math.ceil(cssH * sub.dpr));
  if (sub.canvas.width !== pw || sub.canvas.height !== ph) {
    sub.canvas.width = pw;
    sub.canvas.height = ph;
  }
  if (sub.ctx.imageSmoothingEnabled !== true) {
    sub.ctx.imageSmoothingEnabled = true;
  }
  const smoothingQuality = reglBlitImageSmoothingQuality();
  if (sub.ctx.imageSmoothingQuality !== smoothingQuality) {
    sub.ctx.imageSmoothingQuality = smoothingQuality;
  }

  if (opts.wildcardBlur) {
    const downsampleRatio = texPx / Math.max(1, Math.max(pw, ph));
    const blurPx =
      useMobileMaterialLowPower() || downsampleRatio <= 1.0
        ? 0
        : Math.min(0.35, (downsampleRatio - 1.0) * 0.2);
    sub.ctx.filter = blurPx > 0.0 ? `blur(${blurPx.toFixed(3)}px)` : "none";
    sub.ctx.drawImage(offscreen, 0, 0, texPx, texPx, 0, 0, pw, ph);
    sub.ctx.filter = "none";
    sub._displayFrameReady = true;
    return;
  }

  sub.ctx.drawImage(offscreen, 0, 0, texPx, texPx, 0, 0, pw, ph);
  sub._displayFrameReady = true;
}

/**
 * 从已有展示 canvas 复制一帧（2D drawImage，无 WebGL）。
 * @param {ReglDisplaySubscriber} fromSub
 * @param {ReglDisplaySubscriber} toSub
 * @returns {boolean}
 */
export function copyReglSubscriberDisplayFrame(fromSub, toSub) {
  if (!fromSub._displayFrameReady || fromSub.canvas.width <= 0 || fromSub.canvas.height <= 0) {
    return false;
  }
  let cssW = toSub.canvas.clientWidth;
  let cssH = toSub.canvas.clientHeight;
  const useFixed =
    typeof toSub.fixedCssWidth === "number" &&
    typeof toSub.fixedCssHeight === "number" &&
    Number.isFinite(toSub.fixedCssWidth) &&
    Number.isFinite(toSub.fixedCssHeight) &&
    toSub.fixedCssWidth > 0 &&
    toSub.fixedCssHeight > 0;
  if (useFixed) {
    cssW = toSub.fixedCssWidth;
    cssH = toSub.fixedCssHeight;
  }
  if (cssW <= 0 || cssH <= 0) return false;
  const pw = Math.max(2, Math.ceil(cssW * toSub.dpr));
  const ph = Math.max(2, Math.ceil(cssH * toSub.dpr));
  if (toSub.canvas.width !== pw || toSub.canvas.height !== ph) {
    toSub.canvas.width = pw;
    toSub.canvas.height = ph;
  }
  if (toSub.ctx.imageSmoothingEnabled !== true) {
    toSub.ctx.imageSmoothingEnabled = true;
  }
  const smoothingQuality = reglBlitImageSmoothingQuality();
  if (toSub.ctx.imageSmoothingQuality !== smoothingQuality) {
    toSub.ctx.imageSmoothingQuality = smoothingQuality;
  }
  toSub.ctx.drawImage(fromSub.canvas, 0, 0, pw, ph);
  toSub._displayFrameReady = true;
  return true;
}

/**
 * 飞字等新建 subscriber：优先从仍在动的 peer 复制当前帧。
 * @param {ReglDisplaySubscriber} targetSub
 * @param {Iterable<ReglDisplaySubscriber>} peers
 * @returns {boolean}
 */
export function seedReglSubscriberFromPeers(targetSub, peers) {
  for (const peer of peers) {
    if (peer.canvas === targetSub.canvas || peer.frameFrozen) continue;
    if (copyReglSubscriberDisplayFrame(peer, targetSub)) return true;
  }
  for (const peer of peers) {
    if (peer.canvas === targetSub.canvas) continue;
    if (copyReglSubscriberDisplayFrame(peer, targetSub)) return true;
  }
  return false;
}

/**
 * 带剖析的材质 hub 单帧：1 次 WebGL draw + 对可见订阅者 blit。
 * @param {string} materialId
 * @param {Iterable<ReglDisplaySubscriber>} subscribers
 * @param {{ texPx: number } | null | undefined} hub
 * @param {() => void} drawFrame
 * @param {(sub: ReglDisplaySubscriber, source?: HTMLCanvasElement | null) => void} blitOne
 * @param {() => HTMLCanvasElement | null | undefined} [prepareFrameSource]
 */
export function runProfiledMaterialHubTick(materialId, subscribers, hub, drawFrame, blitOne, prepareFrameSource) {
  if (!anyReglSubscriberAnimated(subscribers) || !hub) return;

  const profile = isMaterialProfilerEnabled();
  const tDraw0 = profile ? performance.now() : 0;
  drawFrame();
  const frameSource = prepareFrameSource?.();
  const drawMs = profile ? performance.now() - tDraw0 : 0;

  let blitMs = 0;
  let blitCount = 0;
  for (const sub of subscribers) {
    if (!shouldReglSubscriberReceiveFrames(sub)) continue;
    if (getMaterialBlitExperimentMode() === "skip") continue;
    const tBlit0 = profile ? performance.now() : 0;
    blitOne(sub, frameSource);
    if (profile) {
      blitMs += performance.now() - tBlit0;
      blitCount += 1;
    }
  }

  if (profile) {
    recordMaterialHubProfile(materialId, {
      drawMs,
      blitMs,
      blitCount,
      texPx: hub.texPx,
    });
  }
}

/**
 * 视口可见性 + 首帧布局：避免 WebGL 已绘制但 canvas 尺寸为 0 导致永久空白。
 * @param {ReglDisplaySubscriber} sub
 * @param {(sub: ReglDisplaySubscriber) => void} [repaintOnce]
 * @param {() => void} [onBecomeVisible] 从不可见恢复时重启 hub tick（如详情飞入克隆）
 */
export function bindReglSubscriberViewport(sub, repaintOnce, onBecomeVisible) {
  sub.viewportVisible = true;
  /** @type {(() => void)[]} */
  const cleanups = [];

  if (typeof IntersectionObserver !== "undefined") {
    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting);
      const wasVisible = sub.viewportVisible !== false;
      sub.viewportVisible = visible;
      if (visible && !wasVisible) {
        onBecomeVisible?.();
        if (typeof repaintOnce === "function" && !sub._displayFrameReady) {
          repaintOnce(sub);
        } else if (typeof repaintOnce === "function" && sub.animated !== false && !sub.frameFrozen) {
          repaintOnce(sub);
        }
      }
    }, { threshold: 0 });
    io.observe(sub.canvas);
    cleanups.push(() => io.disconnect());
  }

  if (typeof ResizeObserver !== "undefined" && typeof repaintOnce === "function") {
    const ro = new ResizeObserver(() => {
      const w = sub.canvas.clientWidth;
      const h = sub.canvas.clientHeight;
      if (w <= 0 || h <= 0) return;
      if (!sub._displayFrameReady) {
        repaintOnce(sub);
      }
    });
    ro.observe(sub.canvas);
    cleanups.push(() => ro.disconnect());
  }

  sub._disposeReglBindings = () => {
    for (const fn of cleanups) fn();
    sub._disposeReglBindings = null;
  };
}

/** @param {ReglDisplaySubscriber} sub */
export function disposeReglSubscriberBindings(sub) {
  sub._disposeReglBindings?.();
}

/**
 * @param {Set<ReglDisplaySubscriber>} subscribers
 * @param {HTMLCanvasElement} canvas
 * @returns {ReglDisplaySubscriber | null}
 */
export function findReglSubscriberByCanvas(subscribers, canvas) {
  for (const sub of subscribers) {
    if (sub.canvas === canvas) return sub;
  }
  return null;
}

/**
 * @param {ReglDisplaySubscriber} sub
 * @param {boolean} animated
 * @param {{ paintSubscriberOnce: (sub: ReglDisplaySubscriber) => void, ensureTick: () => void, stopTickIfIdle: () => void }} hub
 */
export function applyReglSubscriberAnimated(sub, animated, hub) {
  const prev = sub.animated !== false;
  if (prev === animated) return;
  sub.animated = animated;
  if (animated) {
    sub.frameFrozen = false;
    // 占位格解冻须立刻用当前 iTime 重绘，避免仍显示入词时定格的旧帧（飞回落位闪一下）
    hub.paintSubscriberOnce(sub);
    hub.ensureTick();
  } else {
    if (!sub._displayFrameReady) {
      hub.paintSubscriberOnce(sub);
    }
    sub.frameFrozen = true;
  }
  hub.stopTickIfIdle();
}
