import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";

/** 与对局信息表格 Tab 同节奏：stagger 总窗较短，单元素时长另计 */
const STAGGER_SPREAD = 0.34;
const DURATION = 0.52;
const ENTER_Y = 9;

/**
 * @param {number} count
 * @param {number} totalSpread
 */
function evenStagger(count, totalSpread) {
  if (count <= 1) return 0;
  return totalSpread / (count - 1);
}

/**
 * @param {HTMLElement[]} elements
 * @returns {HTMLElement[]}
 */
export function sortElementsTopLeftToBottomRight(elements) {
  return [...elements].sort((a, b) => {
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const rowSlop = 8;
    if (Math.abs(ra.top - rb.top) > rowSlop) return ra.top - rb.top;
    return ra.left - rb.left;
  });
}

/**
 * @param {HTMLElement | null | undefined} root
 * @returns {HTMLElement[]}
 */
export function collectDeckLayerEnterTargets(root) {
  if (!root) return [];
  const els = [...root.querySelectorAll(".deck-layer-enter-stagger")];
  return sortElementsTopLeftToBottomRight(els);
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function prepareDeckLayerEnter(root) {
  const targets = collectDeckLayerEnterTargets(root);
  if (!targets.length) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: 0, y: ENTER_Y, scale: 1 });
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function playDeckLayerEnter(root) {
  const targets = collectDeckLayerEnterTargets(root);
  if (!targets.length) return;
  prepareDeckLayerEnter(root);
  gsap.to(targets, {
    opacity: 1,
    y: 0,
    duration: DURATION,
    ease: EASE_TRANSFORM,
    stagger: evenStagger(targets.length, STAGGER_SPREAD),
  });
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function killDeckLayerEnter(root) {
  if (!root) return;
  const targets = root.querySelectorAll(".deck-layer-enter-stagger");
  if (targets.length) gsap.killTweensOf(targets);
}
