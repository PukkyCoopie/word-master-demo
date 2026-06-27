import { describe, concept } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 9,
  rarity: "epic",
  unlockPrerequisite: { type: "ownedEpicMinOrLegendaryMin", epicMin: 3, legendaryMin: 1 },
  description: describe(
    "传说宝藏有概率出现在商店中，且拥有",
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
