import { attachMaterialRegl, setMaterialReglAnimated } from "./reglMaterialHub.js";

/** @param {HTMLCanvasElement} canvas @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options] */
export function attachLuckyRegl(canvas, options = {}) {
  return attachMaterialRegl("lucky", canvas, options);
}

/** @param {HTMLCanvasElement} canvas @param {boolean} animated */
export function setLuckyReglAnimated(canvas, animated) {
  setMaterialReglAnimated("lucky", canvas, animated);
}

export function warmupLuckyReglHub() {}
