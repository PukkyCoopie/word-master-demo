import { attachMaterialRegl, setMaterialReglAnimated } from "./reglMaterialHub.js";

/** @param {HTMLCanvasElement} canvas @param {{ fixedCssWidth?: number, fixedCssHeight?: number, animated?: boolean }} [options] */
export function attachSteelRegl(canvas, options = {}) {
  return attachMaterialRegl("steel", canvas, options);
}

/** @param {HTMLCanvasElement} canvas @param {boolean} animated */
export function setSteelReglAnimated(canvas, animated) {
  setMaterialReglAnimated("steel", canvas, animated);
}

export function warmupSteelReglHub() {}
