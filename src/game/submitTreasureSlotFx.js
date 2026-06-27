import {
  SCORING_BUBBLE_POP_DELAY_MS,
} from "./scoreBubbleFx.js";
import { scoringSleep } from "./submitScoringTiming.js";

const SCORING_GAP_SCALE = 0.7;
const SCORING_LETTER_GAP_MS = Math.round(50 * 1.2 * SCORING_GAP_SCALE);

/**
 * @typedef {Object} SubmitTreasureSlotFxDeps
 * @property {{ scoringTreasureBarIndex: import('vue').Ref<number | null>, shopOverlayLayersSuppressed: import('vue').Ref<boolean> }} refs
 * @property {(slotIndex: number) => HTMLElement | null | undefined} getOwnedTreasureBarFxEl
 * @property {(el: HTMLElement, label: string, kind: string, speed?: number, bubbleZ?: number) => HTMLElement | null} showScoreBubble
 * @property {(el: HTMLElement | null | undefined, speed?: number) => void} wobbleScoreSlot
 * @property {(bubble: HTMLElement | null | undefined, speed?: number) => void} scheduleSmallPlusBubbleOutro
 * @property {() => number} bumpOverlayZ
 * @property {typeof import('vue').nextTick} nextTick
 */

/**
 * 记分/弃牌路径：宝藏栏槽位 wobble + 气泡 burst（S.4）。
 *
 * @param {SubmitTreasureSlotFxDeps} deps
 */
export function createSubmitTreasureSlotFx(deps) {
  const {
    refs,
    getOwnedTreasureBarFxEl,
    showScoreBubble,
    wobbleScoreSlot,
    scheduleSmallPlusBubbleOutro,
    bumpOverlayZ,
    nextTick,
  } = deps;

  /** @param {number} slotIndex @param {string} text @param {string} [kind] */
  async function playTreasureSlotBubbleBurstAtPeak(slotIndex, text, kind = "score") {
    const el = getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const label = String(text ?? "").trim();
    if (!label) return;
    const sp = 1;
    const prevShopSuppressed = refs.shopOverlayLayersSuppressed.value;
    refs.shopOverlayLayersSuppressed.value = true;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const bubbleZ = bumpOverlayZ();
    try {
      refs.scoringTreasureBarIndex.value = slotIndex;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      wobbleScoreSlot(el, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      const bubble = showScoreBubble(el, label, kind, sp, bubbleZ);
      scheduleSmallPlusBubbleOutro(bubble, sp);
      await scoringSleep(SCORING_LETTER_GAP_MS, sp);
    } finally {
      refs.scoringTreasureBarIndex.value = null;
      refs.shopOverlayLayersSuppressed.value = prevShopSuppressed;
    }
  }

  /** @param {number} slotIndex @param {number} delta */
  async function playTreasureSlotMultDeltaBurstAtPeak(slotIndex, delta) {
    const el = getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const d = Math.round(Number(delta) || 0);
    if (d === 0) return;
    const sp = 1;
    const prevShopSuppressed = refs.shopOverlayLayersSuppressed.value;
    refs.shopOverlayLayersSuppressed.value = true;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const bubbleZ = bumpOverlayZ();
    try {
      refs.scoringTreasureBarIndex.value = slotIndex;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      wobbleScoreSlot(el, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      const bubble = showScoreBubble(el, d > 0 ? `+${d}` : String(d), "mult", sp, bubbleZ);
      scheduleSmallPlusBubbleOutro(bubble, sp);
      await scoringSleep(SCORING_LETTER_GAP_MS, sp);
    } finally {
      refs.scoringTreasureBarIndex.value = null;
      refs.shopOverlayLayersSuppressed.value = prevShopSuppressed;
    }
  }

  /** @param {number} slotIndex @param {number} amount */
  async function playTreasureSlotScoreBurstAtPeak(slotIndex, amount) {
    const el = getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const sp = 1;
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    if (amt <= 0) return;
    refs.scoringTreasureBarIndex.value = slotIndex;
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    wobbleScoreSlot(el, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = showScoreBubble(el, `+${amt}`, "score", sp);
    scheduleSmallPlusBubbleOutro(bubble, sp);
    await scoringSleep(SCORING_LETTER_GAP_MS, sp);
    refs.scoringTreasureBarIndex.value = null;
  }

  return {
    playTreasureSlotBubbleBurstAtPeak,
    playTreasureSlotMultDeltaBurstAtPeak,
    playTreasureSlotScoreBurstAtPeak,
  };
}
