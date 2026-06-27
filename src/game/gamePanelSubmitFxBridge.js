import { createScoreBubbleFx, SCORING_TREASURE_FALLBACK_MS } from "./scoreBubbleFx.js";
import { scoringSleep } from "./submitScoringTiming.js";

/**
 * GamePanel 记分 FX：复用 `createScoreBubbleFx`，并补宝藏栏 wobble 编排。
 * @param {{
 *   triggerHaptic: (kind: string) => void,
 *   getTreasureSlotRoots: () => Iterable<unknown>,
 *   getOwnedTreasureBarFxEl: (slotIndex: number) => HTMLElement | null | undefined,
 * }} deps
 */
export function createGamePanelSubmitFxBridge(deps) {
  const scoringFx = createScoreBubbleFx({
    triggerHaptic: deps.triggerHaptic,
    getTreasureSlotRoots: deps.getTreasureSlotRoots,
  });

  /** @param {number} slotIndex */
  async function wobbleGameTreasureSlot(slotIndex) {
    const el = deps.getOwnedTreasureBarFxEl(slotIndex);
    if (!el) return;
    const sp = 1;
    const tl = scoringFx.createWobbleScoreSlotTimeline(el);
    if (!tl) {
      await scoringSleep(SCORING_TREASURE_FALLBACK_MS, sp);
      return;
    }
    tl.timeScale(sp);
    tl.play(0);
    await scoringFx.awaitWobbleScoreSlotTimeline(tl);
  }

  /** @param {number[]} slotIndices */
  async function wobbleGameTreasureSlots(slotIndices) {
    for (const ix of slotIndices) {
      if (typeof ix === "number" && ix >= 0) await wobbleGameTreasureSlot(ix);
    }
  }

  return {
    scoringFx,
    ...scoringFx,
    wobbleGameTreasureSlot,
    wobbleGameTreasureSlots,
  };
}
