import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("普通字母提供", mult("+10"), "倍率，且会额外触发一次计分"),
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
  getLetterReplayCountForLetter(_ctx, part) {
    return part?.rarity === "common" ? 1 : 0;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "common", multDelta: 10, bubbleLabel: "+10" };
  },
};
