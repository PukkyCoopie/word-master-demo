import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("你的单词视为+2的长度，每关拼写次数-1"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getSubmitLengthBonus() {
    return 2;
  },
  getHandsPerLevelDelta() {
    return -1;
  },
};
