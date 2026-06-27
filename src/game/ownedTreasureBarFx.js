import {
  SCORING_BUBBLE_POP_DELAY_MS,
  LEVEL_COMPLETE_MONEY_FX_OUTRO_WAIT_MS,
} from "./scoreBubbleFx.js";
import { scoringSleep } from "./submitScoringTiming.js";

/**
 * 宝藏栏记分 / wobble / 气泡 FX（从 GamePanel 迁出）。
 * @param {{
 *   nextTick: () => Promise<void>,
 *   findOwnedTreasureSlotIndex: (treasureId: string) => number,
 *   findAllOwnedTreasureSlotIndices: (treasureId: string) => number[],
 *   getOwnedTreasureBarFxEl: (slotIndex: number) => HTMLElement | null | undefined,
 *   getShopOverlayLayersSuppressed: () => boolean,
 *   setShopOverlayLayersSuppressed: (v: boolean) => void,
 *   getScoringTreasureBarIndex: () => number | null,
 *   setScoringTreasureBarIndex: (v: number | null) => void,
 *   addMoney: (amount: number) => void,
 *   wobbleGameTreasureSlot: (slotIndex: number) => Promise<void>,
 *   wobbleScoreSlot: (el: HTMLElement, speed?: number) => void,
 *   showScoreBubble: (...args: unknown[]) => unknown,
 *   scheduleSmallPlusBubbleOutro: (bubble: unknown, speed?: number) => void,
 *   formatMoneyBubbleLabel: (amount: number) => string,
 *   bumpOverlayZ: () => number,
 *   scoringLetterGapMs: number,
 * }} deps
 */
export function createOwnedTreasureBarFx(deps) {
  /** @param {number} slotIndex @param {number} amount @param {{ awaitOutro?: boolean }} [opts] */
  async function playTreasureSlotMoneyBurstAtPeak(slotIndex, amount, opts = {}) {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const sp = 1;
    const amt = Math.max(0, Math.floor(Number(amount) || 0));
    if (amt <= 0) return;
    deps.wobbleScoreSlot(el, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = deps.showScoreBubble(el, deps.formatMoneyBubbleLabel(amt), "money", sp);
    deps.scheduleSmallPlusBubbleOutro(bubble, sp);
    deps.addMoney(amt);
    if (opts.awaitOutro) {
      await scoringSleep(LEVEL_COMPLETE_MONEY_FX_OUTRO_WAIT_MS, sp);
    }
  }

  /** @param {string} treasureId @param {number} amount @param {{ awaitOutro?: boolean, slotIndex?: number }} [opts] */
  async function playOwnedTreasureMoneyFx(treasureId, amount, opts = {}) {
    const slotIx =
      typeof opts.slotIndex === "number" && opts.slotIndex >= 0
        ? opts.slotIndex
        : deps.findOwnedTreasureSlotIndex(treasureId);
    if (slotIx < 0) return;
    await playTreasureSlotMoneyBurstAtPeak(slotIx, amount, opts);
  }

  /** @param {number} slotIndex @param {string} text @param {string} [kind] */
  async function playTreasureSlotBubbleBurstAtPeak(slotIndex, text, kind = "score") {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const label = String(text ?? "").trim();
    if (!label) return;
    const sp = 1;
    const prevShopSuppressed = deps.getShopOverlayLayersSuppressed();
    deps.setShopOverlayLayersSuppressed(true);
    await deps.nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const bubbleZ = deps.bumpOverlayZ();
    try {
      deps.setScoringTreasureBarIndex(slotIndex);
      await deps.nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      deps.wobbleScoreSlot(el, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      const bubble = deps.showScoreBubble(el, label, kind, sp, bubbleZ);
      deps.scheduleSmallPlusBubbleOutro(bubble, sp);
      await scoringSleep(deps.scoringLetterGapMs, sp);
    } finally {
      deps.setScoringTreasureBarIndex(null);
      deps.setShopOverlayLayersSuppressed(prevShopSuppressed);
    }
  }

  /** @param {string} treasureId @param {string} text @param {string} [kind] */
  async function playOwnedTreasureBubbleFx(treasureId, text, kind = "score") {
    for (const ix of deps.findAllOwnedTreasureSlotIndices(treasureId)) {
      await playTreasureSlotBubbleBurstAtPeak(ix, text, kind);
    }
  }

  async function playOwnedTreasureBubbleOnlyFx(treasureId, text, kind = "score") {
    for (const ix of deps.findAllOwnedTreasureSlotIndices(treasureId)) {
      await playOwnedTreasureBubbleOnlyFxAtSlot(ix, text, kind);
    }
  }

  async function playOwnedTreasureBubbleOnlyFxAtSlot(slotIndex, text, kind = "score") {
    const ix = Math.floor(Number(slotIndex));
    if (!Number.isFinite(ix) || ix < 0) return;
    const el = deps.getOwnedTreasureBarFxEl(ix);
    if (!el) return;
    const label = String(text ?? "").trim();
    if (!label) return;
    deps.setScoringTreasureBarIndex(ix);
    await deps.nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, 1);
    const bubble = deps.showScoreBubble(el, label, kind, 1);
    deps.scheduleSmallPlusBubbleOutro(bubble, 1);
    deps.setScoringTreasureBarIndex(null);
  }

  async function playOwnedTreasureWobbleOnlyFx(treasureId) {
    for (const ix of deps.findAllOwnedTreasureSlotIndices(treasureId)) {
      await deps.wobbleGameTreasureSlot(ix);
    }
  }

  /** @param {number} slotIndex @param {number} delta */
  async function playTreasureSlotMultDeltaBurstAtPeak(slotIndex, delta) {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const d = Math.round(Number(delta) || 0);
    if (d === 0) return;
    const sp = 1;
    const prevShopSuppressed = deps.getShopOverlayLayersSuppressed();
    deps.setShopOverlayLayersSuppressed(true);
    await deps.nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    const bubbleZ = deps.bumpOverlayZ();
    try {
      deps.setScoringTreasureBarIndex(slotIndex);
      await deps.nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      deps.wobbleScoreSlot(el, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      const bubble = deps.showScoreBubble(el, d > 0 ? `+${d}` : String(d), "mult", sp, bubbleZ);
      deps.scheduleSmallPlusBubbleOutro(bubble, sp);
      await scoringSleep(deps.scoringLetterGapMs, sp);
    } finally {
      deps.setScoringTreasureBarIndex(null);
      deps.setShopOverlayLayersSuppressed(prevShopSuppressed);
    }
  }

  async function playOwnedTreasureMultDeltaFx(treasureId, delta) {
    for (const ix of deps.findAllOwnedTreasureSlotIndices(treasureId)) {
      await playTreasureSlotMultDeltaBurstAtPeak(ix, delta);
    }
  }

  async function playTreasureSlotScoreBurstAtPeak(slotIndex, amount) {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el || slotIndex < 0) return;
    const sp = 1;
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    if (amt <= 0) return;
    deps.setScoringTreasureBarIndex(slotIndex);
    await deps.nextTick();
    await new Promise((r) => requestAnimationFrame(r));
    deps.wobbleScoreSlot(el, sp);
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
    const bubble = deps.showScoreBubble(el, `+${amt}`, "score", sp);
    deps.scheduleSmallPlusBubbleOutro(bubble, sp);
    await scoringSleep(deps.scoringLetterGapMs, sp);
    deps.setScoringTreasureBarIndex(null);
  }

  async function playOwnedTreasureScoreDeltaFx(treasureId, delta) {
    for (const ix of deps.findAllOwnedTreasureSlotIndices(treasureId)) {
      await playTreasureSlotScoreBurstAtPeak(ix, delta);
    }
  }

  async function playOwnedTreasureBubbleFxAtSlot(slotIndex, text, kind = "score") {
    const ix = Math.floor(Number(slotIndex));
    if (!Number.isFinite(ix) || ix < 0) return;
    await playTreasureSlotBubbleBurstAtPeak(ix, text, kind);
  }

  async function wobbleOwnedTreasureAtSlot(slotIndex) {
    const ix = Math.floor(Number(slotIndex));
    if (!Number.isFinite(ix) || ix < 0) return;
    deps.setShopOverlayLayersSuppressed(true);
    await deps.nextTick();
    await deps.wobbleGameTreasureSlot(ix);
    deps.setShopOverlayLayersSuppressed(false);
  }

  async function wobbleOwnedTreasureById(treasureId) {
    const indices = deps.findAllOwnedTreasureSlotIndices(treasureId);
    if (!indices.length) return;
    deps.setShopOverlayLayersSuppressed(true);
    try {
      await deps.nextTick();
      for (const ix of indices) {
        await deps.wobbleGameTreasureSlot(ix);
      }
    } finally {
      deps.setShopOverlayLayersSuppressed(false);
    }
  }

  function ownedTreasureHookFxBridge() {
    return {
      playOwnedTreasureBubbleFx,
      playOwnedTreasureBubbleFxAtSlot,
      playOwnedTreasureBubbleOnlyFx,
      playOwnedTreasureBubbleOnlyFxAtSlot,
      wobbleOwnedTreasureById,
      wobbleOwnedTreasureAtSlot,
      playOwnedTreasureMultDeltaFx,
      playTreasureMultDeltaFxAtSlot: async (slotIndex, delta) => {
        const ix = Math.floor(Number(slotIndex) || 0);
        if (ix >= 0) await playTreasureSlotMultDeltaBurstAtPeak(ix, delta);
      },
      playOwnedTreasureScoreDeltaFx,
      playTreasureScoreDeltaFxAtSlot: async (slotIndex, delta) => {
        const ix = Math.floor(Number(slotIndex) || 0);
        if (ix >= 0) await playTreasureSlotScoreBurstAtPeak(ix, delta);
      },
    };
  }

  return {
    playTreasureSlotMoneyBurstAtPeak,
    playOwnedTreasureMoneyFx,
    playTreasureSlotBubbleBurstAtPeak,
    playOwnedTreasureBubbleFx,
    playOwnedTreasureBubbleOnlyFx,
    playOwnedTreasureBubbleOnlyFxAtSlot,
    playOwnedTreasureWobbleOnlyFx,
    playTreasureSlotMultDeltaBurstAtPeak,
    playOwnedTreasureMultDeltaFx,
    playTreasureSlotScoreBurstAtPeak,
    playOwnedTreasureScoreDeltaFx,
    playOwnedTreasureBubbleFxAtSlot,
    wobbleOwnedTreasureAtSlot,
    wobbleOwnedTreasureById,
    ownedTreasureHookFxBridge,
  };
}
