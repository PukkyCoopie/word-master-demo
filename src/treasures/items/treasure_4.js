import { describe, mult, rarity } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("拼写的", rarity("史诗"), "字母在记分时给予", mult("+6"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterRarityMultAdd(ctx) {
    return ctx.letterParts.filter((p) => p.rarity === "epic").length * 6;
  },
  getLetterRarityMultDeltaForLetterPart(part) {
    return part?.rarity === "epic" ? 6 : 0;
  },
  getLetterRarityMultAnimConfig() {
    return { targetRarity: "epic", multDelta: 6, bubbleLabel: "+6" };
  },
};
