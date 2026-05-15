import { describe, money } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "epic",
  description: describe("如果关卡的第一次移除只有一个字母，则将其从牌库中永久移除并获得", money("3")),
};
