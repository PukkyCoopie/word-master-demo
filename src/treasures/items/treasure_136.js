import { describe } from "../treasureDescription.js";

const ID = "136";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("你可以卖出本宝藏以消除当前关卡的Boss限制"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onTreasureSold(ctx) {
    if (String(ctx.soldTreasureId ?? "") !== ID) return;
    if (ctx.treasureRun) ctx.treasureRun.levelBossRestrictionSuppressed = true;
  },
};
