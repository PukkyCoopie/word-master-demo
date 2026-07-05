import { describe, money } from "../treasureDescription.js";
import { resolveTreasureHookAnimSlotIndex } from "../../game/treasureBlueprintMirror.js";

const ID = "48";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("触发boss的限制时，获得", money("8")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onBossRestrictionTriggered(ctx) {
    if (!ctx.bossSlug) return;
    const slotIndex = resolveTreasureHookAnimSlotIndex(ctx);
    await ctx.playOwnedTreasureMoneyFx?.(ID, 8, slotIndex != null ? { slotIndex } : {});
  },
};
