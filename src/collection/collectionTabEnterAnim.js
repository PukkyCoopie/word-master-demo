import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";
import { collectionEnterOpacityForTarget } from "./collectionDisplayUtils.js";

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
      ".collection-shop-cell, .collection-voucher-cell, .collection-material-row, .collection-accessory-row, .collection-leaderboard-entry, .collection-empty-tab",
    ),
  ];
  return items.length ? items : [root];
}

/**
 * @param {HTMLElement} root
 * @returns {HTMLElement | null}
 */
function findCollectionScrollContainer(root) {
  return root?.closest?.(".collection-body") ?? null;
}

/**
 * @param {HTMLElement} el
 * @param {HTMLElement} scrollContainer
 */
function isElementInScrollViewport(el, scrollContainer) {
  const c = scrollContainer.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return (
    r.bottom > c.top &&
    r.top < c.bottom &&
    r.right > c.left &&
    r.left < c.right
  );
}

/**
 * @param {HTMLElement} root
 * @returns {{ all: HTMLElement[], animate: HTMLElement[], skipAnim: HTMLElement[] }}
 */
function partitionEnterTargets(root) {
  const all = collectEnterTargets(root);
  if (!all.length) return { all: [], animate: [], skipAnim: [] };
  if (all.length === 1 && all[0] === root) {
    return { all, animate: all, skipAnim: [] };
  }
  const scrollContainer = findCollectionScrollContainer(root);
  if (!scrollContainer) {
    return { all, animate: all, skipAnim: [] };
  }
  const animate = [];
  const skipAnim = [];
  for (const el of all) {
    if (isElementInScrollViewport(el, scrollContainer)) {
      animate.push(el);
    } else {
      skipAnim.push(el);
    }
  }
  if (!animate.length) {
    return { all, animate: all, skipAnim: [] };
  }
  return { all, animate, skipAnim };
}

/** @param {HTMLElement[]} targets */
function instantRevealCollectionEnter(targets) {
  gsap.killTweensOf(targets);
  for (const el of targets) {
    gsap.set(el, {
      opacity: collectionEnterOpacityForTarget(el),
      y: 0,
      scale: 1,
    });
  }
}

/** @param {HTMLElement[]} targets */
function clearCollectionEnterOpacityProps(targets) {
  gsap.set(targets, { clearProps: "opacity" });
}

/**
 * @param {HTMLElement | null | undefined} root
 */
export function prepareCollectionTabEnter(root) {
  const { all, animate, skipAnim } = partitionEnterTargets(root);
  if (!all.length) return;
  if (shouldSkipDecorativeMotion()) {
    instantRevealCollectionEnter(all);
    return;
  }
  gsap.killTweensOf(all);
  if (all.length === 1 && all[0] === root) {
    gsap.set(root, { opacity: 0, y: PANEL_Y });
    return;
  }
  if (skipAnim.length) {
    instantRevealCollectionEnter(skipAnim);
  }
  if (animate.length) {
    gsap.set(animate, { opacity: 0, y: ITEM_Y, scale: 1 });
  }
}

/**
 * @param {HTMLElement | null | undefined} root
 * @param {{ delayMs?: number }} [options]
 * @returns {gsap.core.Tween | gsap.core.Timeline | null}
 */
export function playCollectionTabEnter(root, options = {}) {
  const delaySec = Math.max(0, Number(options.delayMs) || 0) / 1000;
  const { all, animate, skipAnim } = partitionEnterTargets(root);
  if (!all.length) return null;
  if (shouldSkipDecorativeMotion()) {
    instantRevealCollectionEnter(all);
    return null;
  }
  prepareCollectionTabEnter(root);
  if (all.length === 1 && all[0] === root) {
    return gsap.to(root, {
      opacity: 1,
      y: 0,
      duration: PANEL_DURATION,
      delay: delaySec,
      ease: EASE_TRANSFORM,
    });
  }
  if (!animate.length) {
    instantRevealCollectionEnter(all);
    return null;
  }
  if (skipAnim.length) {
    instantRevealCollectionEnter(skipAnim);
  }
  const stagger =
    animate.length > 1 ? ITEM_STAGGER_SPREAD / (animate.length - 1) : 0;
  return gsap.to(animate, {
    opacity: (_index, el) => collectionEnterOpacityForTarget(el),
    y: 0,
    duration: ITEM_DURATION,
    delay: delaySec,
    stagger,
    ease: EASE_TRANSFORM,
    onComplete: () => clearCollectionEnterOpacityProps(all),
  });
}
