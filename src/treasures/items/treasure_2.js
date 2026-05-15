import { describe, mult, rarity } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("拼写的", rarity("普通"), "字母在记分时给予", mult("+1"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterRarityMultAdd(ctx) {
    return ctx.letterParts.filter((p) => p.rarity === "common").length;
  },
  getLetterRarityMultDeltaForLetterPart(part) {
    return part?.rarity === "common" ? 1 : 0;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "common", multDelta: 1, bubbleLabel: "+1" };
  },
};
