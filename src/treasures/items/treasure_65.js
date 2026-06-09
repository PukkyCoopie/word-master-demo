import { describe, prob, score } from "../treasureDescription.js";
import {
  addScoreAddBank,
  getScoreAddBank,
  patchCurrentBankDescription,
} from "../treasureBankHelpers.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";

export const TREASURE_65_ID = "65";
export const DISCARD_PROC_NUMERATOR = 1;
export const DISCARD_PROC_DENOMINATOR = 8;
export const DISCARD_SCORE_AWARD = 4;

/**
 * @param {number} letterCount
 * @param {() => number} [rng]
 * @param {readonly (string | null | undefined)[]} [ownedSlotTreasureIds]
 * @returns {number[]}
 */
export function rollPotteryDiscardProcIndices(letterCount, rng = Math.random, ownedSlotTreasureIds) {
  const n = Math.max(0, Math.floor(Number(letterCount) || 0));
  /** @type {number[]} */
  const indices = [];
  for (let i = 0; i < n; i += 1) {
    if (
      rollProbabilitySuccess(
        DISCARD_PROC_NUMERATOR,
        DISCARD_PROC_DENOMINATOR,
        rng,
        ownedSlotTreasureIds,
      )
    ) {
      indices.push(i);
    }
  }
  return indices;
}

/**
 * @param {import("../treasureRunState.js").TreasureRunState | null | undefined} rs
 * @param {number[]} indices
 */
export function applyPotteryDiscardProcs(rs, indices) {
  if (!rs || !indices?.length) return;
  for (let k = 0; k < indices.length; k += 1) {
    addScoreAddBank(rs, TREASURE_65_ID, DISCARD_SCORE_AWARD);
  }
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(
    "每当你弃掉一个字母，有",
    prob("1/8"),
    "的概率获得",
    score("+4"),
    "分数",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(TREASURE_65_ID, "scoreAdd"),
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, TREASURE_65_ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  onDiscardBatch(ctx) {
    if (ctx.discardPotteryFxHandled) return;
    const preset = ctx.potteryDiscardProcIndices;
    if (Array.isArray(preset)) {
      applyPotteryDiscardProcs(ctx.treasureRun, preset);
      return;
    }
    const rs = ctx.treasureRun;
    if (!rs) return;
    const rnd = typeof ctx.rng === "function" ? ctx.rng : Math.random;
    const rolled = rollPotteryDiscardProcIndices(
      (ctx.discardedLetters ?? []).length,
      rnd,
      ctx.ownedSlotTreasureIds,
    );
    applyPotteryDiscardProcs(rs, rolled);
  },
};
