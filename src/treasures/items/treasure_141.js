import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "epic",
  description: describe(
    "已经持有的宝藏仍然会出现在商店中，且必定拥有一个增益配饰",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  guaranteesShopTreasureGainAccessory() {
    return true;
  },
};
