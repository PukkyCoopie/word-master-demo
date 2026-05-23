import { getViewportSize, DESIGN_ASPECT } from "../composables/useScale.js";

function isViewportNarrowerThanDesign() {
  const { w, h } = getViewportSize();
  return h > 0 && w / h < DESIGN_ASPECT;
}

/** 将逻辑框内的半透明蒙层延伸到整页视口（letterbox 区域） */
export function portalScrimBleedShadow(rgba) {
  return `0 0 0 100vmax ${rgba}`;
}

/** GSAP：窄屏写入 backgroundColor + 视口延拓；宽屏仅 backgroundColor（由逻辑框裁剪） */
export function portalScrimGsapVars(rgba) {
  const vars = { backgroundColor: rgba };
  if (isViewportNarrowerThanDesign()) {
    vars.boxShadow = portalScrimBleedShadow(rgba);
  } else {
    vars.boxShadow = "none";
  }
  return vars;
}
