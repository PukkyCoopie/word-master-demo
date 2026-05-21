import { describe, mult } from "../treasureDescription.js";
import { countDeckCardsWithEnhancement } from "../treasureDeckEnhancement.js";

const MIN_ENHANCED = 16;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "epic",
  description: describe(
    "如果你的完整牌库中有至少16个具有增益的字母块，",
    mult("x3"),
    "倍率",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const deck = ctx.fullDeck;
    if (!Array.isArray(deck)) return null;
    if (countDeckCardsWithEnhancement(deck) < MIN_ENHANCED) return null;
    return { multMul: 3 };
  },
};
