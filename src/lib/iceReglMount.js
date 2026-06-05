import { attachMaterialRegl, setMaterialReglAnimated } from "./reglMaterialHub.js";

/** @param {HTMLCanvasElement} canvas @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options] */
export function attachIceRegl(canvas, options = {}) {
  return attachMaterialRegl("ice", canvas, options);
}

/** @param {HTMLCanvasElement} canvas @param {boolean} animated */
export function setIceReglAnimated(canvas, animated) {
  setMaterialReglAnimated("ice", canvas, animated);
}

export function warmupIceReglHub() {}
