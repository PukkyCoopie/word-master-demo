import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";

const ROW_STAGGER_SPREAD = 0.28;
const ROW_DURATION = 0.45;
const ROW_Y = 10;

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
  if (!targets.length) return;
  gsap.killTweensOf(targets);
  gsap.set(targets, { opacity: 0, y: ROW_Y, scale: 1 });
}

/**
 * @param {HTMLElement[]} targets
 */
export function playRunStartDialogEnter(targets) {
  if (!targets.length) return;
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

/** 切 tab 时清掉离场面板的 GSAP 内联样式，避免 visibility:visible 穿透 hidden 父级 */
/** @param {HTMLElement | null | undefined} panelEl */
export function resetRunStartPanelGsapProps(panelEl) {
  if (!panelEl) return;
  const els = [...panelEl.querySelectorAll(".run-start-stagger-el")];
  if (!els.length) return;
  gsap.killTweensOf(els);
  gsap.set(els, { clearProps: "opacity,transform,visibility" });
}
