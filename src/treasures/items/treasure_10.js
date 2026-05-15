import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("如果单词中所有字母的稀有度相同，", mult("+12"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.uniformOk ? { multAdd: 12 } : null;
  },
};
