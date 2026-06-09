import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("如果单词中包含至少3种稀有度，", score("+200"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.threeRaritiesOk ? { scoreAdd: 200 } : null;
  },
};
