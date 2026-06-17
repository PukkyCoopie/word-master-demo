import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("+4丢弃次数，你的单词被视为-1的长度"),
  unlockPrerequisite: { type: "chapterAllDiscardsExhausted" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getRemovalsPerLevelDelta() {
    return 4;
  },
  getLengthJudgmentPenalty() {
    return 1;
  },
};
