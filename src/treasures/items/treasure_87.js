import { describe } from "../treasureDescription.js";

const ID = "87";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "common",
  description: describe("每当进入关卡时，随机获取2个新的宝藏（需要有空位）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onLevelEnter(ctx) {
    const grant = ctx.grantRandomOwnedTreasureWithPopAnim ?? ctx.grantRandomOwnedTreasure;
    if (typeof grant !== "function") return;
    await ctx.wobbleOwnedTreasureById?.(ID);
    await grant(2);
  },
};
