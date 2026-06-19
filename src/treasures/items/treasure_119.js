import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 2,
  rarity: "common",
  description: describe(score("+40"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep() {
    return { scoreAdd: 40 };
  },
};
