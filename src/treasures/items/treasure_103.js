import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "epic",
  description: describe(score("+400"), "分数，你的单词被视为-2的长度"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep() {
    return { scoreAdd: 400 };
  },
  getLengthJudgmentPenalty() {
    return 2;
  },
};
