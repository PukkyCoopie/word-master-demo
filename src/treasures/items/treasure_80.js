import { describe, score } from "../treasureDescription.js";
import { getScoreAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const ID = "80";
const SCORE_PER_B = 8;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe("每当你拼写了字母b，获得", score("+8"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "scoreAdd"),
  perLetterScoreCueDepositsTreasureBank: true,
  showPerLetterScoreCueBubble: false,
  buildPostLetterStep(ctx) {
    const total = getScoreAddBank(ctx.treasureRun, ID);
    return total > 0 ? { scoreAdd: total } : null;
  },
  getPerLetterScoreCue(ctx, part) {
    const visit = Math.max(0, Math.floor(Number(ctx?.scoringVisitIndex) || 0));
    if (visit > 0) return null;
    if (normalizeLetterChar(part?.letter) !== "b") return null;
    return { delta: SCORE_PER_B, label: `+${SCORE_PER_B}` };
  },
};
