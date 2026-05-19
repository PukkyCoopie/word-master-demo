import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("你接下来的10个单词都会额外触发一次字母计分"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  patchDescription(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.extraLetterScoreWordsRemaining) || 0));
    return describe(`（剩余${n}个单词）`);
  },
  getExtraLetterScoringPasses(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.extraLetterScoreWordsRemaining <= 0) return 0;
    return 1;
  },
  onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.extraLetterScoreWordsRemaining <= 0) return;
    rs.extraLetterScoreWordsRemaining -= 1;
  },
};
