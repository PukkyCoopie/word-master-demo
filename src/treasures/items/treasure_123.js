import { describe, discardDelta } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 3,
  rarity: "common",
  description: describe(discardDelta("+1")),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getRemovalsPerLevelDelta() {
    return 1;
  },
};
