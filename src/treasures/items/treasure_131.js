import { describe, money } from "../treasureDescription.js";
import { resolveTreasureHookAnimSlotIndex } from "../../game/treasureBlueprintMirror.js";
import { deckCardRaw } from "../../game/deckCardSync.js";

const ID = "131";
const MONEY_PER_C = 2;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("每个关卡完成时，你完整字母库中的每个C使你获得", money(String(MONEY_PER_C))),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onLevelComplete(ctx) {
    const deck = ctx.fullDeck ?? [];
    let count = 0;
    for (const card of deck) {
      if (!card || typeof card !== "object") continue;
      if (String(deckCardRaw(card)).toUpperCase() === "C") count += 1;
    }
    if (count <= 0) return;
    const slotIndex = resolveTreasureHookAnimSlotIndex(ctx);
    await ctx.playOwnedTreasureMoneyFx?.(ID, count * MONEY_PER_C, slotIndex != null ? { slotIndex } : {});
  },
};
