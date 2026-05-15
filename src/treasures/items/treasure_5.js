import { describe, mult, rarity } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("拼写的", rarity("传说"), "字母在记分时给予", mult("+10"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterRarityMultAdd(ctx) {
    return ctx.letterParts.filter((p) => p.rarity === "legendary").length * 10;
  },
  getLetterRarityMultDeltaForLetterPart(part) {
    return part?.rarity === "legendary" ? 10 : 0;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "legendary", multDelta: 10, bubbleLabel: "+10" };
  },
};
