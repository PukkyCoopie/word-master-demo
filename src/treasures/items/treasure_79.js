import { describe, mult } from "../treasureDescription.js";
import { distinctRarityCount } from "../treasureLogicShared.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("如果你的一次拼写中拥有4种不同的稀有度，具有", mult("x3"), "倍率"),
  unlockPrerequisite: { type: "endlessMode" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return distinctRarityCount(ctx.letterParts) >= 4 ? { multMul: 3 } : null;
  },
};
