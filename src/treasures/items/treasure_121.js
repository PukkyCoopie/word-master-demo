import { describe, money } from "../treasureDescription.js";
import { resolveTreasureHookAnimSlotIndex } from "../../game/treasureBlueprintMirror.js";

const ID = "121";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("每个关卡完成时，获得", money("4")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onLevelComplete(ctx) {
    const slotIndex = resolveTreasureHookAnimSlotIndex(ctx);
    await ctx.playOwnedTreasureMoneyFx?.(ID, 4, slotIndex != null ? { slotIndex } : {});
  },
};
