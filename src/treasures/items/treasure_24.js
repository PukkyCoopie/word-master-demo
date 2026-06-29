import { describe } from "../treasureDescription.js";

const ID = "24";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 3,
  rarity: "common",
  description: describe("每次进入商店获得1次免费刷新"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onShopEnter(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    rs.shopFreeRerollsRemaining = Math.max(0, Math.floor(Number(rs.shopFreeRerollsRemaining) || 0)) + 1;
    await ctx.wobbleOwnedTreasureById?.(ID);
    await ctx.playOwnedTreasureBubbleFx?.(ID, "免费刷新", "skip");
  },
};
