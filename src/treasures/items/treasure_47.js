import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("你的牌库中每剩余一个字母，", score("+2"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const left = Math.max(0, Math.floor(Number(ctx.remainingDeckCount) || 0));
    return left > 0 ? { scoreAdd: left * 2 } : null;
  },
};
