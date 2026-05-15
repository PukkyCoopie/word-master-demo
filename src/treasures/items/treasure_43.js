import { describe, mult, rarity } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "epic",
  description: describe("如果棋盘中剩下的都是", rarity("普通"), "或", rarity("稀有"), "字母，", mult("x3"), "倍率"),
};
