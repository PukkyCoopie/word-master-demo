import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("史诗字母提供", mult("x2"), "倍率"),
  unlockPrerequisite: { type: "deckEpicMin", min: 8 },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterRarityMultMulForLetterPart(part) {
    return part?.rarity === "epic" ? 2 : 1;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "epic", multMul: 2, bubbleLabel: "x2" };
  },
};
