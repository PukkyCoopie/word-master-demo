import { describe, money } from "../treasureDescription.js";

const ID = "41";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("在关卡完成时本宝藏的出售价格提高", money("3")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onLevelComplete(ctx) {
    ctx.bumpOwnedTreasurePriceById?.(ID, 3);
    await ctx.wobbleOwnedTreasureById?.(ID);
  },
};
