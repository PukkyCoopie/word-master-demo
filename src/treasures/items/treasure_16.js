import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("如果单词的长度为3或更短，", mult("+30"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.shortWordOk ? { multAdd: 30 } : null;
  },
};
