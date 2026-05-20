import { describe, money, prob } from "../treasureDescription.js";
import { isVowelLetterWithMask } from "../treasureLetterClassify.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("元音字母在记分时有", prob("1/2"), "概率使你获得", money("2")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const rnd = ctx.rng ?? Math.random;
    let moneyAdd = 0;
    for (const p of ctx.letterParts ?? []) {
      if (!isVowelLetterWithMask(p?.letter, ctx.ownedSlotTreasureIds)) continue;
      if (rollProbabilitySuccess(1, 2, rnd, ctx.ownedSlotTreasureIds)) moneyAdd += 2;
    }
    return moneyAdd > 0 ? { moneyAdd } : null;
  },
};
