import { attachMaterialRegl, setMaterialReglAnimated } from "./reglMaterialHub.js";

/** @param {HTMLCanvasElement} canvas @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options] */
export function attachFireRegl(canvas, options = {}) {
  return attachMaterialRegl("fire", canvas, options);
}

/** @param {HTMLCanvasElement} canvas @param {boolean} animated */
export function setFireReglAnimated(canvas, animated) {
  setMaterialReglAnimated("fire", canvas, animated);
}

export function warmupFireReglHub() {}
