import { describe, score } from "../treasureDescription.js";
import { getScoreAddBank } from "../treasureBankHelpers.js";
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

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function patchBKeyDescription(ctx) {
  const v = Math.round(getScoreAddBank(ctx.treasureRun, ID));
  return describe(
    "每当字母B计分时，获得",
    score("+8"),
    "分数",
    "（当前",
    score(v >= 0 ? `+${v}` : String(v)),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe("每当字母B计分时，获得", score("+8"), "分数", "（当前", score("+0"), "）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: patchBKeyDescription,
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
