import { describe, money } from "../treasureDescription.js";

const ID = "106";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("在关卡完成时，你在本轮游戏中每使用过1次升级，获得", money("1"), "（当前为$0）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.treasureRun?.runUpgradesUsedCount) || 0));
    return describe("在关卡完成时，你在本轮游戏中每使用过1次升级，获得", money("1"), "（当前为", money(String(n)), "）");
  },
  async onLevelComplete(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.treasureRun?.runUpgradesUsedCount) || 0));
    if (n <= 0) return;
    await ctx.playOwnedTreasureMoneyFx?.(ID, n);
  },
};
