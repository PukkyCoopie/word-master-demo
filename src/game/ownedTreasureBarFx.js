import {
  SCORING_BUBBLE_POP_DELAY_MS,
  LEVEL_COMPLETE_MONEY_FX_OUTRO_WAIT_MS,
} from "./scoreBubbleFx.js";
import { getLevelEndAnimSpeed } from "./levelEndAnimSpeed.js";
import { scoringSleep } from "./submitScoringTiming.js";
import { shouldSkipSettlementTreasureFx } from "../settings/settlementAnimSkip.js";

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
  /**
   * 关卡结束单拍：触发 wobble，仅 await 到峰值；落回与下一 hook 重叠进行（对齐拼词计分）。
   * @param {number} slotIndex
   * @param {(ctx: { el: HTMLElement, sp: number, bubbleZ: number }) => void | Promise<void>} [atPeak]
   */
  async function runLevelEndTreasureSlotBeat(slotIndex, atPeak) {
    const ix = Math.floor(Number(slotIndex));
    if (!Number.isFinite(ix) || ix < 0) return;
    const el = deps.getOwnedTreasureBarFxEl(ix);
    if (!el) return;
    const sp = getLevelEndAnimSpeed();
    const prevShopSuppressed = deps.getShopOverlayLayersSuppressed();
    deps.setShopOverlayLayersSuppressed(true);
    await deps.nextTick();
    const bubbleZ = deps.bumpOverlayZ();
    try {
      deps.setScoringTreasureBarIndex(ix);
      await deps.nextTick();
      deps.wobbleScoreSlot(el, sp);
      await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
      if (atPeak) await atPeak({ el, sp, bubbleZ });
    } finally {
      deps.setScoringTreasureBarIndex(null);
      deps.setShopOverlayLayersSuppressed(prevShopSuppressed);
    }
  }

  /** @param {number} slotIndex @param {number} amount @param {{ awaitOutro?: boolean }} [opts] */
  async function playTreasureSlotMoneyBurstAtPeak(slotIndex, amount, opts = {}) {
    if (slotIndex < 0) return;
    const amt = Math.max(0, Math.floor(Number(amount) || 0));
    if (amt <= 0) return;
    if (shouldSkipSettlementTreasureFx()) {
      deps.addMoney(amt);
      return;
    }
    await runLevelEndTreasureSlotBeat(slotIndex, async ({ el, sp, bubbleZ }) => {
      const bubble = deps.showScoreBubble(el, deps.formatMoneyBubbleLabel(amt), "money", sp, bubbleZ);
      deps.scheduleSmallPlusBubbleOutro(bubble, sp);
      deps.addMoney(amt);
      if (opts.awaitOutro) {
        await scoringSleep(LEVEL_COMPLETE_MONEY_FX_OUTRO_WAIT_MS, sp);
      }
    });
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
    const label = String(text ?? "").trim();
    if (!label) return;
    if (shouldSkipSettlementTreasureFx()) return;
    await runLevelEndTreasureSlotBeat(slotIndex, async ({ el, sp, bubbleZ }) => {
      const bubble = deps.showScoreBubble(el, label, kind, sp, bubbleZ);
      deps.scheduleSmallPlusBubbleOutro(bubble, sp);
    });
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
    await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, getLevelEndAnimSpeed());
    const bubble = deps.showScoreBubble(el, label, kind, getLevelEndAnimSpeed());
    deps.scheduleSmallPlusBubbleOutro(bubble, getLevelEndAnimSpeed());
    deps.setScoringTreasureBarIndex(null);
  }

  async function playOwnedTreasureWobbleOnlyFx(treasureId) {
    for (const ix of deps.findAllOwnedTreasureSlotIndices(treasureId)) {
      await runLevelEndTreasureSlotBeat(ix);
    }
  }

  /** @param {number} slotIndex @param {number} delta */
  async function playTreasureSlotMultDeltaBurstAtPeak(slotIndex, delta) {
    const d = Math.round(Number(delta) || 0);
    if (d === 0) return;
    await runLevelEndTreasureSlotBeat(slotIndex, async ({ el, sp, bubbleZ }) => {
      const bubble = deps.showScoreBubble(el, d > 0 ? `+${d}` : String(d), "mult", sp, bubbleZ);
      deps.scheduleSmallPlusBubbleOutro(bubble, sp);
    });
  }

  async function playOwnedTreasureMultDeltaFx(treasureId, delta) {
    for (const ix of deps.findAllOwnedTreasureSlotIndices(treasureId)) {
      await playTreasureSlotMultDeltaBurstAtPeak(ix, delta);
    }
  }

  async function playTreasureSlotScoreBurstAtPeak(slotIndex, amount) {
    const amt = Math.max(0, Math.round(Number(amount) || 0));
    if (amt <= 0) return;
    await runLevelEndTreasureSlotBeat(slotIndex, async ({ el, sp, bubbleZ }) => {
      const bubble = deps.showScoreBubble(el, `+${amt}`, "score", sp, bubbleZ);
      deps.scheduleSmallPlusBubbleOutro(bubble, sp);
    });
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
    await runLevelEndTreasureSlotBeat(slotIndex);
  }

  async function wobbleOwnedTreasureById(treasureId) {
    for (const ix of deps.findAllOwnedTreasureSlotIndices(treasureId)) {
      await runLevelEndTreasureSlotBeat(ix);
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
