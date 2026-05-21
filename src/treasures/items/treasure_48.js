import { describe, money } from "../treasureDescription.js";

const ID = "48";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("当你触发boss的限制时，获得", money("8")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onBossRestrictionTriggered(ctx) {
    if (!ctx.bossSlug) return;
    await ctx.playOwnedTreasureMoneyFx?.(ID, 8);
  },
};
