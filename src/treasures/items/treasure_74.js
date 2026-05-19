import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("普通字母在计分时提供", mult("+10"), "倍率"),
  unlockPrerequisite: { type: "deckAllCommon" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterRarityMultAdd(ctx) {
    return ctx.letterParts.filter((p) => p.rarity === "common").length * 10;
  },
  getLetterRarityMultDeltaForLetterPart(part) {
    return part?.rarity === "common" ? 10 : 0;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "common", multDelta: 10, bubbleLabel: "+10" };
  },
};
