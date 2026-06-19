import gsap from "gsap";

/** @type {WeakMap<HTMLElement, { timeoutId?: ReturnType<typeof setTimeout>; outroTween?: gsap.core.Tween }>} */
const dismissHandlesByEl = new WeakMap();

/** 取消已排队的离场（不杀入场 tween，避免气泡卡在 opacity:0） */
function cancelScheduledPopupBubbleDismiss(el) {
  const prev = dismissHandlesByEl.get(el);
  if (!prev) return;
  if (prev.timeoutId != null) clearTimeout(prev.timeoutId);
  prev.outroTween?.kill();
  dismissHandlesByEl.delete(el);
}

/**
 * 气泡最终可见态（无入场位移/缩放/淡入）。
 * @param {HTMLElement} div
 */
export function setPopupBubbleVisibleInstant(div) {
  gsap.killTweensOf(div);
  gsap.set(div, { opacity: 1, scale: 1, y: 0, x: 0, rotation: 0 });
}

/**
 * 按原时序移除气泡（含淡出）；减少动画模式下仍播放完整离场。
 * @param {HTMLElement | null | undefined} el
 * @param {object} opts
 * @param {number} opts.delayS
 * @param {number} opts.durationS
 * @param {number} [opts.speed]
 * @param {(speed: number) => gsap.core.Tween | void} [opts.onAnimateOutro]
 */
export function schedulePopupBubbleDismiss(el, opts) {
  if (!el) return;
  const speed = Math.max(0.01, Number(opts.speed) || 1);
  cancelScheduledPopupBubbleDismiss(el);
  const outroTween = opts.onAnimateOutro?.(speed);
  if (outroTween && typeof outroTween.kill === "function") {
    dismissHandlesByEl.set(el, { outroTween });
    outroTween.eventCallback("onComplete", () => dismissHandlesByEl.delete(el));
  }
}

/**
 * @param {HTMLElement} targetEl
 * @param {string} text
 * @param {"score" | "mult" | "level" | "info"} kind
 * @returns {HTMLElement | null}
 */
export function createShopStylePopupBubble(targetEl, text, kind = "score") {
  if (!targetEl) return null;
  const rect = targetEl.getBoundingClientRect();
  const div = document.createElement("div");
  if (kind === "mult") div.className = "mult-popup-bubble";
  else if (kind === "level") div.className = "score-popup-bubble shop-level-popup-bubble";
  else if (kind === "info") div.className = "score-popup-bubble shop-round-info-popup-bubble";
  else div.className = "score-popup-bubble";
  div.textContent = text;
  document.body.appendChild(div);
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
  gsap.set(div, {
    position: "fixed",
    left: rect.left + rect.width / 2,
    top: rect.top - 12 * rpx,
    xPercent: -50,
    yPercent: -100,
    transformOrigin: "50% 100%",
    force3D: true,
    zIndex: 350,
  });
  return div;
}

/**
 * @param {HTMLElement} div
 * @param {number} [speed]
 */
export function playShopStylePopupBubbleEnter(div, speed = 1) {
  const s = Math.max(0.01, Number(speed) || 1);
  gsap.fromTo(
    div,
    { opacity: 0, y: 18, scale: 0.5 },
    { opacity: 1, y: 0, scale: 1, duration: 0.3 / s, ease: "expo.out" },
  );
}

/** @param {HTMLElement} div @param {number} [speed] */
export function dismissShopStylePopupBubble(div, speed = 1) {
  schedulePopupBubbleDismiss(div, {
    delayS: 0.4,
    durationS: 0.28,
    speed,
    onAnimateOutro: (s) =>
      gsap.to(div, {
        opacity: 0,
        y: -14,
        scale: 0.92,
        duration: 0.28 / s,
        delay: 0.4 / s,
        ease: "expo.out",
        onComplete: () => div.remove(),
      }),
  });
}

/** @param {HTMLElement} targetEl @param {string} text @param {"score" | "mult" | "level" | "info"} [kind] */
export function bubbleAtShopPanel(targetEl, text, kind = "score") {
  const div = createShopStylePopupBubble(targetEl, text, kind);
  if (!div) return;
  playShopStylePopupBubbleEnter(div);
  dismissShopStylePopupBubble(div);
}
