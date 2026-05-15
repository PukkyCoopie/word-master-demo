import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "epic",
  description: describe("使用最后一次拼写机会拼写的单词会额外触发一次字母计分"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getExtraLetterScoringPasses(ctx) {
    return ctx.isLastSubmitChance ? 1 : 0;
  },
};
