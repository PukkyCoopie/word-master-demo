import { describe, concept } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "epic",
  description: describe(
    "你已经持有的宝藏仍然会在商店中出现，且拥有",
    concept("配饰"),
    "的概率提高50%",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getShopAccessoryChanceMult() {
    return 1.5;
  },
};
