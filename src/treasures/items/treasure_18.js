import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("你每剩余一次移除机会，", score("+40"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const remaining = Math.max(0, Math.floor(Number(ctx.remainingRemovals) || 0));
    const bonus = remaining * 40;
    return bonus > 0 ? { scoreAdd: bonus } : null;
  },
};
