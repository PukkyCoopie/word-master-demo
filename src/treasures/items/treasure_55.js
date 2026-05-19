import { describe, score } from "../treasureDescription.js";
import { addScoreAddBank, getScoreAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "55";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("当拼写的单词长度为4时，获得", score("+10"), "分数", "（当前+0）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "scoreAdd"),
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  onSuccessfulWordSubmit(ctx) {
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength) || 0));
    if (len === 4) addScoreAddBank(ctx.treasureRun, ID, 10);
  },
};
