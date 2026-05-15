import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("如果单词中包含连续的相同字母，", mult("+10"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return ctx.conditions.streakOk ? { multAdd: 10 } : null;
  },
};
