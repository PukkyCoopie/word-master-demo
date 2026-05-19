import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe("如果单词中某个字母出现的次数为3次或以上，", score("+100"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.tripleOk ? { scoreAdd: 100 } : null;
  },
};
