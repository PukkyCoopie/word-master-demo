import { DESIGN_ASPECT, getViewportSize } from "../composables/viewportSize.js";
import { getDisplayLayoutMode } from "./gameSettings.js";

/**
 * 视口比 750×1500 更窄（偏高、contain 上下留白）→ 无边界布局；
 * 更宽（左右留白）→ 容器居中布局。
 * @param {number} [w]
 * @param {number} [h]
 */
export function isViewportNarrowerThanDesign(w, h) {
  if (w == null || h == null) {
    const { w: vw, h: vh } = getViewportSize();
    return isViewportNarrowerThanDesign(vw, vh);
  }
  return h > 0 && w / h < DESIGN_ASPECT;
}

/**
 * 是否启用无边界布局（覆层铺满视口、去圆角等）。
 * @param {number} [w]
 * @param {number} [h]
 */
export function resolveBorderlessLayout(w, h) {
  void w;
  void h;
  return getDisplayLayoutMode() === "borderless";
}

/**
 * @param {number} w
 * @param {number} h
 */
export function applyBorderlessLayoutHtmlClass(w, h) {
  document.documentElement.classList.toggle(
    "viewport-narrower-than-design",
    resolveBorderlessLayout(w, h),
  );
}
