import { describe, money, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("你每有", money("1"), "，", score("+2"), "分数"),
};

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function patchMoneyScoreDescription(ctx) {
  const dollars = Math.max(0, Math.floor(Number(ctx.money) || 0));
  const v = dollars * 2;
  return describe("（当前", score(v >= 0 ? `+${v}` : String(v)), "）");
}

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  patchDescription: patchMoneyScoreDescription,
  buildPostLetterStep(ctx) {
    const dollars = Math.max(0, Math.floor(Number(ctx.money) || 0));
    if (dollars <= 0) return null;
    return { scoreAdd: dollars * 2 };
  },
};
