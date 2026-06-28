import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";

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
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: 0, y: TABLE_Y, scale: 1 });
}

/**
 * @param {HTMLElement[]} targets
 */
export function prepareInfoCouponTabEnter(targets) {
  if (!targets.length) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: 0, scale: 0.68, y: 0 });
}

/**
 * @param {HTMLElement[]} targets
 */
export function playInfoGridTabEnter(targets) {
  if (!targets.length) return;
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
  prepareInfoCouponTabEnter(targets);
  gsap.to(targets, {
    opacity: 1,
    scale: 1,
    duration: COUPON_DURATION,
    ease: "back.out(1.42)",
    stagger: evenStagger(targets.length, COUPON_STAGGER_SPREAD),
  });
}

const GRID_LEAVE_DURATION = 0.11;
const GRID_LEAVE_STAGGER = 0.028;
const GRID_LEAVE_Y = 5;

/**
 * @param {HTMLElement[]} targets
 * @returns {Promise<void>}
 */
export function playInfoGridTabLeave(targets) {
  if (!targets.length) return Promise.resolve();
  gsap.killTweensOf(targets);
  const rev = [...targets].reverse();
  return new Promise((resolve) => {
    gsap.to(rev, {
      opacity: 0,
      y: GRID_LEAVE_Y,
      duration: GRID_LEAVE_DURATION,
      stagger: GRID_LEAVE_STAGGER,
      ease: EASE_TRANSFORM,
      onComplete: resolve,
    });
  });
}

/**
 * @param {HTMLElement[]} targets
 * @returns {Promise<void>}
 */
export function playInfoCouponTabLeave(targets) {
  if (!targets.length) return Promise.resolve();
  gsap.killTweensOf(targets);
  const rev = [...targets].reverse();
  return new Promise((resolve) => {
    gsap.to(rev, {
      opacity: 0,
      scale: 0.92,
      duration: 0.15,
      stagger: 0.03,
      ease: EASE_TRANSFORM,
      onComplete: resolve,
    });
  });
}
