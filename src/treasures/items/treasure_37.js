import { describe, money } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("元音字母在记分时有1/2概率使你获得", money("2")),
};
