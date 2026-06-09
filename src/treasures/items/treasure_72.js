import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("史诗字母在计分时提供", mult("x2"), "倍率"),
  unlockPrerequisite: { type: "deckEpicMin", min: 8 },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const parts = ctx.letterParts ?? [];
    let epicCount = 0;
    for (const p of parts) {
      if (p?.rarity === "epic") epicCount += 1;
    }
    if (epicCount <= 0) return null;
    return { multMul: 2 ** epicCount };
  },
};
