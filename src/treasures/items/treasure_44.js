import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("每当你拼写的单词不包含重复的字母，获得", score("+20"), "分数"),
};
