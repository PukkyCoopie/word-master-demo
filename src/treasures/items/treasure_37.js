import { describe, money } from "../treasureDescription.js";
import { isVowelLetterWithMask } from "../treasureLetterClassify.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("元音字母在记分时有1/2概率使你获得", money("2")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const rnd = ctx.rng ?? Math.random;
    let moneyAdd = 0;
    for (const p of ctx.letterParts ?? []) {
      if (!isVowelLetterWithMask(p?.letter, ctx.ownedSlotTreasureIds)) continue;
      if (rnd() < 0.5) moneyAdd += 2;
    }
    return moneyAdd > 0 ? { moneyAdd } : null;
  },
};
