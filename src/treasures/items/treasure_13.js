import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 3,
  rarity: "rare",
  description: describe("如果单词中不包含重复的字母，", score("+60"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.uniqueOk ? { scoreAdd: 60 } : null;
  },
};
