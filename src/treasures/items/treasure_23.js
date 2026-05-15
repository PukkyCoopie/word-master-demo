import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("会将棋盘中最高的稀有度对应的奖励分数添加至倍率"),
};
