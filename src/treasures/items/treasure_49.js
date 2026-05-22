import { describe, money } from "../treasureDescription.js";
import { countVowelsInDiscardBatch } from "../treasureLifecycleShared.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("每当一次丢弃至少5个元音字母时，获得", money("5")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onDiscardBatch(ctx) {
    const vowels = countVowelsInDiscardBatch(ctx.discardedLetters, ctx.ownedSlotTreasureIds);
    if (vowels < 5) return;
    await ctx.playOwnedTreasureMoneyFx?.("49", 5);
  },
};
