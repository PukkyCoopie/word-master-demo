import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "legendary",
  description: describe(
    "如果关卡中拼写的第一个单词只有3个字母或更少，则将第一个字母的一个相同的复制洗入牌库",
  ),
};
