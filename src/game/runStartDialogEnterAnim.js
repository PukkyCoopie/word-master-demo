import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";

const ROW_STAGGER_SPREAD = 0.28;
const ROW_DURATION = 0.45;
const ROW_Y = 10;

/** @type {boolean | null} */
let reducedMotionCached = null;

function prefersReducedMotion() {
  if (reducedMotionCached === null) {
    reducedMotionCached =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return reducedMotionCached;
}

/**
 * @param {number} count
 * @param {number} totalSpread
 */
function evenStagger(count, totalSpread) {
  if (count <= 1) return 0;
  return totalSpread / (count - 1);
}

/**
 * @param {HTMLElement[]} targets
 */
export function prepareRunStartDialogEnterHidden(targets) {
  if (!targets.length || prefersReducedMotion()) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: 0, y: ROW_Y, scale: 1 });
}

/**
 * @param {HTMLElement[]} targets
 */
export function playRunStartDialogEnter(targets) {
  if (!targets.length) return;
  if (prefersReducedMotion()) {
    gsap.set(targets, { opacity: 1, y: 0, scale: 1 });
    return;
  }
  gsap.to(targets, {
    opacity: 1,
    y: 0,
    duration: ROW_DURATION,
    ease: EASE_TRANSFORM,
    stagger: evenStagger(targets.length, ROW_STAGGER_SPREAD),
  });
}

/** @param {HTMLElement[]} targets */
export function killRunStartDialogEnterTweens(targets) {
  if (!targets.length) return;
  gsap.killTweensOf(targets);
}
