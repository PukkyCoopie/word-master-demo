import { describe, mult, rarity } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("拼写的", rarity("稀有"), "字母在记分时给予", mult("+3"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterRarityMultAdd(ctx) {
    return ctx.letterParts.filter((p) => p.rarity === "rare").length * 3;
  },
  getLetterRarityMultDeltaForLetterPart(part) {
    return part?.rarity === "rare" ? 3 : 0;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "rare", multDelta: 3, bubbleLabel: "+3" };
  },
};
