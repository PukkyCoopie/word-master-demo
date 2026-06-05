import { attachMaterialRegl, setMaterialReglAnimated } from "./reglMaterialHub.js";

/** @param {HTMLCanvasElement} canvas @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options] */
export function attachWildcardRegl(canvas, options = {}) {
  return attachMaterialRegl("wildcard", canvas, options);
}

/** @param {HTMLCanvasElement} canvas @param {boolean} animated */
export function setWildcardReglAnimated(canvas, animated) {
  setMaterialReglAnimated("wildcard", canvas, animated);
}

export function warmupWildcardReglHub() {}
