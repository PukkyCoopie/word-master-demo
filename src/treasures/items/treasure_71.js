import { describe, money } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("传说字母在计分时会提供", money("10")),
  unlockPrerequisite: { type: "deckLegendaryMin", min: 8 },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const parts = ctx.letterParts ?? [];
    let count = 0;
    for (const p of parts) {
      if (p?.rarity === "legendary") count += 1;
    }
    return count > 0 ? { moneyAdd: count * 10 } : null;
  },
};
