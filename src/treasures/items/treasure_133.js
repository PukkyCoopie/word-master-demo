import { describe, money } from "../treasureDescription.js";

const ID = "133";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("每个关卡完成时，使你其他宝藏的售价增加", money("1")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onLevelComplete(ctx) {
    const instances = ctx.ownedTreasureInstances ?? [];
    for (const inst of instances) {
      const tid = String(inst?.treasureId ?? "");
      if (!tid || tid === ID) continue;
      ctx.bumpOwnedTreasureSellRefundBonusById?.(tid, 1);
    }
    await ctx.wobbleOwnedTreasureById?.(ID);
  },
};
