import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";

/** 从候选中随机移除牌库字母的 confirm_all 法术 */
export const SPELL_RANDOM_DECK_REMOVE_IDS = Object.freeze(["familiar", "grim", "incantation"]);

/**
 * @param {string} spellId
 */
export function isRandomDeckRemoveSpell(spellId) {
  return SPELL_RANDOM_DECK_REMOVE_IDS.includes(String(spellId ?? ""));
}

/**
 * @param {HTMLElement} ring
 * @param {DOMRect} rect
 */
function placeRingOnRect(ring, rect) {
  const pad = 4;
  Object.assign(ring.style, {
    position: "fixed",
    left: `${rect.left - pad}px`,
    top: `${rect.top - pad}px`,
    width: `${rect.width + pad * 2}px`,
    height: `${rect.height + pad * 2}px`,
    boxSizing: "border-box",
    border: "calc(4 * var(--rpx)) solid #2ec4b6",
    borderRadius: "calc(10 * var(--rpx))",
    pointerEvents: "none",
    zIndex: "360",
    boxShadow: "0 0 0 calc(2 * var(--rpx)) rgba(46, 196, 182, 0.35)",
  });
}

/**
 * 候选格随机选中外框：减速轮转，点击容器可跳过（结果仍为预选槽位）。
 * @param {object} opts
 * @param {number[]} opts.slotIndices
 * @param {number} opts.winnerSlotIndex
 * @param {(slotIndex: number) => HTMLElement | null | undefined} opts.getOfferWrapEl
 * @param {HTMLElement | null | undefined} opts.gridWrapEl
 */
export async function runSpellOfferRandomPickAnim(opts) {
  const indices = Array.isArray(opts.slotIndices) ? opts.slotIndices.filter((ix) => ix >= 0) : [];
  const winner = Number(opts.winnerSlotIndex);
  if (indices.length <= 1) return;
  const winIx = indices.includes(winner) ? winner : indices[0];

  const ring = document.createElement("div");
  ring.className = "spell-offer-pick-ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(ring);

  let skipped = false;
  /** @type {(() => void) | null} */
  let skipResolve = null;
  const skipPromise = new Promise((resolve) => {
    skipResolve = () => {
      if (skipped) return;
      skipped = true;
      resolve(undefined);
    };
  });

  const wrap = opts.gridWrapEl;
  const onWrapClick = () => skipResolve?.();
  wrap?.addEventListener("click", onWrapClick, { capture: true });

  const placeOn = (slotIx) => {
    const el = opts.getOfferWrapEl?.(slotIx);
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    placeRingOnRect(ring, el.getBoundingClientRect());
  };

  placeOn(indices[0]);

  const minStep = 0.055;
  const maxStep = 0.28;
  const totalCycles = Math.max(indices.length * 3, 8);
  let step = 0;
  let cursor = 0;

  while (step < totalCycles && !skipped) {
    cursor = (cursor + 1) % indices.length;
    placeOn(indices[cursor]);
    const t = step / Math.max(1, totalCycles - 1);
    const delay = minStep + (maxStep - minStep) * t * t;
    step += 1;
    await Promise.race([new Promise((r) => setTimeout(r, delay * 1000)), skipPromise]);
  }
  placeOn(winIx);

  try {
    await new Promise((r) => setTimeout(r, skipped ? 80 : 220));
  } finally {
    wrap?.removeEventListener("click", onWrapClick, { capture: true });
    gsap.to(ring, {
      opacity: 0,
      scale: 1.05,
      duration: 0.12,
      ease: EASE_TRANSFORM,
      onComplete: () => ring.remove(),
    });
  }
}
