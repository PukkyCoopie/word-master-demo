import { describe, money, prob } from "../treasureDescription.js";
import { isVowelLetterWithMask } from "../treasureLetterClassify.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("元音字母有", prob("1/2"), "概率使你获得", money("1")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getPerLetterMoneyCue(ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    const slots = ctx.ownedSlotTreasureIds ?? [];
    if (!letter || !isVowelLetterWithMask(letter, slots)) return null;
    const rnd = ctx.rng ?? Math.random;
    if (!rollProbabilitySuccess(1, 2, rnd, slots)) return null;
    return { money: 1 };
  },
};
