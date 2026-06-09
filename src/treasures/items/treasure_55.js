import { describe, score } from "../treasureDescription.js";
import { bankScoreAddGain, getScoreAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "55";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("当拼写的单词长度为4时，获得", score("+20"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "scoreAdd"),
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength) || 0));
    if (len === 4) await bankScoreAddGain(ctx, ID, 20);
  },
};
