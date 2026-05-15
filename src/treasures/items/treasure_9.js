import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("如果单词中包含至少3种稀有度，", mult("+16"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.threeRaritiesOk ? { multAdd: 16 } : null;
  },
};
