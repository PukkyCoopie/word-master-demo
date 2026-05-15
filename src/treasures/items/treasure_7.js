import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("如果单词中某个字母出现的次数为3次或以上，", mult("+10"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.tripleOk ? { multAdd: 10 } : null;
  },
};
