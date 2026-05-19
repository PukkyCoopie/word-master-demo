import { describe, money, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("你每有", money("1"), "，", score("+2"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const dollars = Math.max(0, Math.floor(Number(ctx.money) || 0));
    if (dollars <= 0) return null;
    return { scoreAdd: dollars * 2 };
  },
};
