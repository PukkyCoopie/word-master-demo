const LOGIC_W = 750;
const LOGIC_H = 1500;

/** 设计画布宽高比（750×1500） */
export const DESIGN_ASPECT = LOGIC_W / LOGIC_H;

export { LOGIC_W, LOGIC_H };

export function getViewportSize() {
  const vv = window.visualViewport;
  if (vv && vv.width > 0 && vv.height > 0) {
    return {
      w: Math.round(vv.width),
      h: Math.round(vv.height),
    };
  }
  return {
    w: window.innerWidth,
    h: window.innerHeight,
  };
}

/** @returns {'centered' | 'borderless'} */
export function inferDefaultDisplayLayoutMode() {
  if (typeof window === "undefined") return "borderless";
  const { w, h } = getViewportSize();
  return h > 0 && w / h < DESIGN_ASPECT ? "borderless" : "centered";
}
