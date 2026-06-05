import { attachMaterialRegl, setMaterialReglAnimated } from "./reglMaterialHub.js";

/** @param {HTMLCanvasElement} canvas @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options] */
export function attachWaterRegl(canvas, options = {}) {
  return attachMaterialRegl("water", canvas, options);
}

/** @param {HTMLCanvasElement} canvas @param {boolean} animated */
export function setWaterReglAnimated(canvas, animated) {
  setMaterialReglAnimated("water", canvas, animated);
}

export function warmupWaterReglHub() {}
