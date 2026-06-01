import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import {
  instantRevealGsapTargets,
  shouldSkipDecorativeMotion,
} from "../settings/animationSpeed.js";

/** 各元素 stagger 均分的时间窗（单元素 duration 另计） */
const GRID_STAGGER_SPREAD = 0.34;
const TABLE_DURATION = 0.52;
const TABLE_Y = 9;

const COUPON_STAGGER_SPREAD = 0.22;
const COUPON_DURATION = 0.62;

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
export function prepareInfoGridTabEnter(targets) {
  if (!targets.length) return;
  if (shouldSkipDecorativeMotion()) {
    instantRevealGsapTargets(targets);
    return;
  }
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: 0, y: TABLE_Y, scale: 1 });
}

/**
 * @param {HTMLElement[]} targets
 */
export function prepareInfoCouponTabEnter(targets) {
  if (!targets.length) return;
  if (shouldSkipDecorativeMotion()) {
    instantRevealGsapTargets(targets, { opacity: 1, scale: 1, y: 0 });
    return;
  }
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: 0, scale: 0.68, y: 0 });
}

/**
 * @param {HTMLElement[]} targets
 */
export function playInfoGridTabEnter(targets) {
  if (!targets.length) return;
  if (shouldSkipDecorativeMotion()) {
    instantRevealGsapTargets(targets);
    return;
  }
  prepareInfoGridTabEnter(targets);
  gsap.to(targets, {
    opacity: 1,
    y: 0,
    duration: TABLE_DURATION,
    ease: EASE_TRANSFORM,
    stagger: evenStagger(targets.length, GRID_STAGGER_SPREAD),
  });
}

/**
 * @param {HTMLElement[]} targets
 */
export function playInfoCouponTabEnter(targets) {
  if (!targets.length) return;
  if (shouldSkipDecorativeMotion()) {
    instantRevealGsapTargets(targets, { opacity: 1, scale: 1, y: 0 });
    return;
  }
  prepareInfoCouponTabEnter(targets);
  gsap.to(targets, {
    opacity: 1,
    scale: 1,
    duration: COUPON_DURATION,
    ease: "back.out(1.42)",
    stagger: evenStagger(targets.length, COUPON_STAGGER_SPREAD),
  });
}
