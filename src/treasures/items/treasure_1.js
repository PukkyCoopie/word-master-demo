import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureBaseDef} */
export default {
  price: 2,
  rarity: "common",
  description: describe(mult("+4"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  isImmuneToVolcanoEruption() {
    return true;
  },
  buildPostLetterStep() {
    return { multAdd: 4 };
  },
};
