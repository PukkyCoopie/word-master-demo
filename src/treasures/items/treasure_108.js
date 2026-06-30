import { describe, mult } from "../treasureDescription.js";
import { countDeckCardsWithEnhancement } from "../treasureDeckEnhancement.js";

const MIN_ENHANCED = 10;
const BASE_MULT = 1.5;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "epic",
  description: describe(
    mult("x1.5"),
    "倍率；如果你的完整字母库中有至少10个具有增益的字母块，此效果翻倍",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const deck = Array.isArray(ctx.fullDeck) ? ctx.fullDeck : [];
    const n = Math.max(0, countDeckCardsWithEnhancement(deck));
    return describe(
      mult("x1.5"),
      "倍率；如果你的完整字母库中有至少10个具有增益的字母块，此效果翻倍",
      `（当前${n}/${MIN_ENHANCED}）`,
    );
  },
  buildPostLetterStep(ctx) {
    const deck = ctx.fullDeck;
    if (!Array.isArray(deck)) return null;
    const enhanced = countDeckCardsWithEnhancement(deck);
    const multMul = enhanced >= MIN_ENHANCED ? BASE_MULT * 2 : BASE_MULT;
    return multMul > 1 ? { multMul } : null;
  },
};
