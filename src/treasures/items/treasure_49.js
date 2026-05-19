import { describe, money } from "../treasureDescription.js";
import { countVowelsInDiscardBatch } from "../treasureLifecycleShared.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("每当一次丢弃超过3个元音字母时，获得", money("5")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onDiscardBatch(ctx) {
    if ((ctx.letterCount ?? 0) <= 3) return;
    const vowels = countVowelsInDiscardBatch(ctx.discardedLetters, ctx.ownedSlotTreasureIds);
    if (vowels <= 3) return;
    ctx.addMoney?.(5);
  },
};
