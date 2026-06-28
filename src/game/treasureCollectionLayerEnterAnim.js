import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { sortElementsTopLeftToBottomRight } from "./deckLayerEnterAnim.js";

const STAGGER_SPREAD = 0.34;
const DURATION = 0.52;
const ENTER_Y = 9;

/**
 * @param {HTMLElement | null | undefined} root
 * @returns {HTMLElement[]}
 */
export function collectTreasureCollectionEnterTargets(root) {
  if (!root) return [];
  const els = [...root.querySelectorAll(".treasure-collection-enter-stagger")];
  return sortElementsTopLeftToBottomRight(els);
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function prepareTreasureCollectionLayerEnter(root) {
  const targets = collectTreasureCollectionEnterTargets(root);
  if (!targets.length) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: 0, y: ENTER_Y, scale: 1 });
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function playTreasureCollectionLayerEnter(root) {
  const targets = collectTreasureCollectionEnterTargets(root);
  if (!targets.length) return;
  prepareTreasureCollectionLayerEnter(root);
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
export function killTreasureCollectionLayerEnter(root) {
  if (!root) return;
  const targets = root.querySelectorAll(".treasure-collection-enter-stagger");
  if (targets.length) gsap.killTweensOf(targets);
}

/**
 * @param {number} count
 * @param {number} totalSpread
 */
function evenStagger(count, totalSpread) {
  if (count <= 1) return 0;
  return totalSpread / (count - 1);
}
