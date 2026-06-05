import { attachMaterialRegl, setMaterialReglAnimated } from "./reglMaterialHub.js";

/** @param {HTMLCanvasElement} canvas @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options] */
export function attachGoldRegl(canvas, options = {}) {
  return attachMaterialRegl("gold", canvas, options);
}

/** @param {HTMLCanvasElement} canvas @param {boolean} animated */
export function setGoldReglAnimated(canvas, animated) {
  setMaterialReglAnimated("gold", canvas, animated);
}

export function warmupGoldReglHub() {
  // 由 warmupSharedReglMaterialHub 统一预编译
}
