import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("如果单词中包含连续的相同字母，", score("+100"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.streakOk ? { scoreAdd: 100 } : null;
  },
};
