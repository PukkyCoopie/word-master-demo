import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 0,
  rarity: "legendary",
  shopEligible: false,
  description: describe("所有Boss限制与能力失效"),
};

/** 效果见 `treasureBossSuppress.js`（持有本宝藏时全局生效） */
