import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("你的单词视为+1的长度，每回合拼写次数-1"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getSubmitLengthBonus() {
    return 1;
  },
  getHandsPerLevelDelta() {
    return -1;
  },
};
