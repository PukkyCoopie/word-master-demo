import { describe, score } from "../treasureDescription.js";
import { patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const ID = "80";
const SCORE_PER_B = 8;

/** @param {import('../treasureTypes.js').TreasureReplaySubmitAdjustmentsContext} ctx */
function countBScoreAdd(ctx) {
  const { letterParts, replayCounts } = ctx;
  let total = 0;
  for (let i = 0; i < (letterParts?.length ?? 0); i++) {
    if (normalizeLetterChar(letterParts[i]?.letter) !== "b") continue;
    const r = 1 + Math.max(0, Math.floor(Number(replayCounts?.[i]) || 0));
    total += SCORE_PER_B * r;
  }
  return total;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe("每当字母B计分时，获得", score("+8"), "分数（当前+n）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "scoreAdd"),
  perLetterScoreCueDepositsTreasureBank: true,
  showPerLetterScoreCueBubble: false,
  accumulateReplaySubmitAdjustments(ctx) {
    const total = countBScoreAdd(ctx);
    return total > 0 ? { scoreAdd: total } : null;
  },
  buildPostLetterStep(ctx) {
    const total = countBScoreAdd(ctx);
    return total > 0 ? { scoreAdd: total } : null;
  },
  getPerLetterScoreCue(_ctx, part) {
    if (normalizeLetterChar(part?.letter) !== "b") return null;
    return { delta: SCORE_PER_B, label: `+${SCORE_PER_B}` };
  },
};
