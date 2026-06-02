import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import {
  instantRevealGsapTargets,
  shouldSkipDecorativeMotion,
} from "../settings/animationSpeed.js";

const PANEL_Y = 10;
const PANEL_DURATION = 0.42;
const ITEM_Y = 8;
const ITEM_DURATION = 0.48;
const ITEM_STAGGER_SPREAD = 0.28;

/**
 * @param {HTMLElement} root
 * @returns {HTMLElement[]}
 */
function collectEnterTargets(root) {
  if (!root) return [];
  const items = [
    ...root.querySelectorAll(
      ".collection-shop-cell, .collection-voucher-cell, .collection-material-card, .collection-accessory-row, .collection-leaderboard-entry, .collection-empty-tab",
    ),
  ];
  return items.length ? items : [root];
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function prepareCollectionTabEnter(root) {
  const targets = collectEnterTargets(root);
  if (!targets.length) return;
  if (shouldSkipDecorativeMotion()) {
    instantRevealGsapTargets(targets, { opacity: 1, y: 0, scale: 1 });
    return;
  }
  gsap.killTweensOf(targets);
  if (targets.length === 1 && targets[0] === root) {
    gsap.set(root, { opacity: 0, y: PANEL_Y });
    return;
  }
  gsap.set(targets, { opacity: 0, y: ITEM_Y, scale: 1 });
}

/**
 * @param {HTMLElement | null | undefined} root
 * @param {{ delayMs?: number }} [options]
 * @returns {gsap.core.Tween | gsap.core.Timeline | null}
 */
export function playCollectionTabEnter(root, options = {}) {
  const delaySec = Math.max(0, Number(options.delayMs) || 0) / 1000;
  const targets = collectEnterTargets(root);
  if (!targets.length) return null;
  if (shouldSkipDecorativeMotion()) {
    instantRevealGsapTargets(targets, { opacity: 1, y: 0, scale: 1 });
    return null;
  }
  prepareCollectionTabEnter(root);
  if (targets.length === 1 && targets[0] === root) {
    return gsap.to(root, {
      opacity: 1,
      y: 0,
      duration: PANEL_DURATION,
      delay: delaySec,
      ease: EASE_TRANSFORM,
    });
  }
  const stagger =
    targets.length > 1 ? ITEM_STAGGER_SPREAD / (targets.length - 1) : 0;
  return gsap.to(targets, {
    opacity: 1,
    y: 0,
    duration: ITEM_DURATION,
    delay: delaySec,
    stagger,
    ease: EASE_TRANSFORM,
  });
}
