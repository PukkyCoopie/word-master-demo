import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "epic",
  description: describe(
    "你已经持有的宝藏仍然会在商店中出现，且必定会拥有一个增益配饰",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  guaranteesShopTreasureGainAccessory() {
    return true;
  },
};
