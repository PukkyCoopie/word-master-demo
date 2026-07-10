import gsap from "gsap";

/**
 * 结束 GSAP 动画并移除 transform 行内样式。
 * 用 removeProperty 代替 gsap.set/clearProps，避免 _getComputedProperty 触发强制重排。
 *
 * @param {HTMLElement | null | undefined} el
 * @param {{ removeOpacity?: boolean }} [options]
 */
export function killGsapAndRemoveTransform(el, options = {}) {
  if (!el) return;
  gsap.killTweensOf(el);
  el.style.removeProperty("transform");
  if (options.removeOpacity === true) {
    el.style.removeProperty("opacity");
  }
}

/**
 * @param {readonly (HTMLElement | null | undefined)[]} els
 * @param {{ removeOpacity?: boolean }} [options]
 */
export function killGsapAndRemoveTransformBatch(els, options = {}) {
  for (const el of els) {
    killGsapAndRemoveTransform(el, options);
  }
}
