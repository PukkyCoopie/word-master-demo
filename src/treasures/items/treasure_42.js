import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("+3丢弃次数，你的单词被视为-1的长度"),
  unlockPrerequisite: { type: "chapterAllDiscardsExhausted" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLengthJudgmentPenalty() {
    return 1;
  },
};
