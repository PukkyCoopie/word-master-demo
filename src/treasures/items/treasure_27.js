import { describe, money } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("在关卡完成时，如果你没有使用过丢弃，则每个丢弃次数会给予你", money("2")),
};
