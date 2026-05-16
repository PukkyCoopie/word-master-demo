import { describe, mult, rarity } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("拼写的", rarity("普通"), "字母在记分时给予", mult("+2"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterRarityMultAdd(ctx) {
    return ctx.letterParts.filter((p) => p.rarity === "common").length * 2;
  },
  getLetterRarityMultDeltaForLetterPart(part) {
    return part?.rarity === "common" ? 2 : 0;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "common", multDelta: 2, bubbleLabel: "+2" };
  },
};
