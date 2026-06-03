/**
 * regl 材质展示 canvas 的「逐帧 / 单帧」订阅控制。
 * 未展开牌库 stack 等场景只需绘制一帧并保留，避免大量 canvas 共用 RAF。
 */

/** @typedef {{ animated?: boolean, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, dpr: number, fixedCssWidth?: number, fixedCssHeight?: number }} ReglDisplaySubscriber */

/**
 * @param {Iterable<ReglDisplaySubscriber>} subscribers
 */
export function anyReglSubscriberAnimated(subscribers) {
  for (const sub of subscribers) {
    if (sub.animated !== false) return true;
  }
  return false;
}

/**
 * @param {ReglDisplaySubscriber} sub
 * @param {HTMLCanvasElement} offscreen
 * @param {number} texPx
 */
export function blitReglOffscreenToSubscriber(sub, offscreen, texPx) {
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
  sub.ctx.imageSmoothingEnabled = true;
  sub.ctx.imageSmoothingQuality = "high";
  sub.ctx.drawImage(offscreen, 0, 0, texPx, texPx, 0, 0, pw, ph);
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
    hub.ensureTick();
  } else {
    hub.paintSubscriberOnce(sub);
  }
  hub.stopTickIfIdle();
}
