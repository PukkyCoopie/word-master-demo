import { describe, score } from "../treasureDescription.js";
import { bankScoreAddGain, getScoreAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { hasAllUniqueLetters } from "../treasureLogicShared.js";

const ID = "44";
const GAIN = 25;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe("如果你拼写的单词不包含重复的字母，获得", score("+25"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "scoreAdd"),
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, ID, ctx);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    const tiles = ctx.submittedScoringTiles ?? ctx.submittedLetters;
    if (!hasAllUniqueLetters(tiles)) return;
    await bankScoreAddGain(ctx, ID, GAIN);
  },
};
