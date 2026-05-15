import { describe, money } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("在关卡完成时，如果你没有使用过移除，则每个移除机会会给予你", money("2")),
};
