import gsap from "gsap";
import { EASE_TRANSFORM } from "../constants.js";

/** 从候选中随机移除牌库字母的 confirm_all 法术 */
export const SPELL_RANDOM_DECK_REMOVE_IDS = Object.freeze(["familiar", "grim", "incantation"]);

/** 从候选中随机挑选 1 个生效的 confirm_all 法术（含移除类） */
export const SPELL_OFFER_RANDOM_PICK_ONE_IDS = Object.freeze([
  ...SPELL_RANDOM_DECK_REMOVE_IDS,
  "talisman",
  "deja_vu",
  "wrench",
  "diamond",
]);

/**
 * @param {string} spellId
 */
export function isRandomDeckRemoveSpell(spellId) {
  return SPELL_RANDOM_DECK_REMOVE_IDS.includes(String(spellId ?? ""));
}

/**
 * @param {string} spellId
 */
export function isSpellOfferRandomPickOneSpell(spellId) {
  return SPELL_OFFER_RANDOM_PICK_ONE_IDS.includes(String(spellId ?? ""));
}

/**
 * @param {HTMLElement} ring
 * @param {DOMRect} rect
 */
function placeRingOnRect(ring, rect) {
  const pad = 5;
  Object.assign(ring.style, {
    position: "fixed",
    left: `${rect.left - pad}px`,
    top: `${rect.top - pad}px`,
    width: `${rect.width + pad * 2}px`,
    height: `${rect.height + pad * 2}px`,
    boxSizing: "border-box",
    pointerEvents: "none",
    zIndex: "360",
    opacity: "1",
  });
  gsap.set(ring, { scale: 1 });
}

/**
 * @param {HTMLElement | null | undefined} wrap
 * @param {boolean} hot
 */
function setOfferWrapRandomHot(wrap, hot) {
  const cell = wrap?.querySelector?.(".spell-target-offer-cell");
  if (!(cell instanceof HTMLElement)) return;
  cell.classList.toggle("spell-target-offer-cell--random-hot", hot);
}

/**
 * @param {number} slotIx
 * @param {(slotIndex: number) => HTMLElement | null | undefined} getOfferWrapEl
 */
async function playWinnerReveal(slotIx, getOfferWrapEl) {
  const wrap = getOfferWrapEl?.(slotIx);
  const cell = wrap?.querySelector?.(".spell-target-offer-cell");
  if (!(wrap instanceof HTMLElement) || !(cell instanceof HTMLElement)) return;

  wrap.classList.add("spell-target-offer-wrap--random-winner");

  await new Promise((resolve) => {
    gsap.fromTo(
      cell,
      { scale: 1 },
      {
        scale: 1.06,
        duration: 0.11,
        yoyo: true,
        repeat: 2,
        ease: "power1.inOut",
        onComplete: resolve,
      },
    );
  });
  await new Promise((r) => setTimeout(r, 320));
  wrap.classList.remove("spell-target-offer-wrap--random-winner");
  cell.classList.remove("spell-target-offer-cell--random-hot");
}

/**
 * 规划轮转总步数：从 `indices[0]` 起每步 +1 循环，最后一步必须落在 `winPos`。
 * @param {number} poolLen
 * @param {number} winPos 中奖下标（在 indices 数组内）
 * @param {number} minAdvances 至少走多少步（保证有减速感）
 */
function planAdvanceCount(poolLen, winPos, minAdvances) {
  if (poolLen <= 1) return 0;
  let advances = Math.max(minAdvances, poolLen);
  const align = (winPos - (advances % poolLen) + poolLen) % poolLen;
  if (align !== 0) advances += align;
  return advances;
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
  const winPos = indices.indexOf(winIx);
  if (winPos < 0) return;

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
  wrap?.classList.add("spell-target-letter-grid-wrap--random-picking");
  const onWrapClick = () => skipResolve?.();
  wrap?.addEventListener("click", onWrapClick, { capture: true });

  /** @type {HTMLElement | null} */
  let lastHotWrap = null;
  const placeOn = (slotIx) => {
    if (lastHotWrap) setOfferWrapRandomHot(lastHotWrap, false);
    const el = opts.getOfferWrapEl?.(slotIx);
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    placeRingOnRect(ring, el.getBoundingClientRect());
    gsap.fromTo(ring, { scale: 0.96 }, { scale: 1, duration: 0.05, ease: EASE_TRANSFORM, overwrite: true });
    lastHotWrap = el;
    setOfferWrapRandomHot(el, true);
  };

  const n = indices.length;
  const minAdvances = Math.max(Math.floor(n * 1.1), 3);
  const totalAdvances = planAdvanceCount(n, winPos, minAdvances);

  let pos = 0;
  placeOn(indices[0]);

  const minStep = 0.05;
  const maxStep = 0.24;

  for (let step = 0; step < totalAdvances && !skipped; step++) {
    pos = (pos + 1) % n;
    placeOn(indices[pos]);
    const t = step / Math.max(1, totalAdvances - 1);
    const delay = minStep + (maxStep - minStep) * t * t;
    await Promise.race([new Promise((r) => setTimeout(r, delay * 1000)), skipPromise]);
  }

  if (skipped && indices[pos] !== winIx) {
    const crawlDelay = 0.04;
    while (indices[pos] !== winIx) {
      pos = (pos + 1) % n;
      placeOn(indices[pos]);
      await new Promise((r) => setTimeout(r, crawlDelay * 1000));
    }
  }

  try {
    await new Promise((r) => setTimeout(r, skipped ? 60 : 140));
    await playWinnerReveal(winIx, opts.getOfferWrapEl);
  } finally {
    if (lastHotWrap) setOfferWrapRandomHot(lastHotWrap, false);
    wrap?.classList.remove("spell-target-letter-grid-wrap--random-picking");
    wrap?.removeEventListener("click", onWrapClick, { capture: true });
    gsap.to(ring, {
      opacity: 0,
      scale: 1.04,
      duration: 0.1,
      ease: EASE_TRANSFORM,
      onComplete: () => ring.remove(),
    });
  }
}
