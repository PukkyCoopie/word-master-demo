import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每当你拼写出一个不是名词的单词，获得", mult("+1"), "倍率"),
};
