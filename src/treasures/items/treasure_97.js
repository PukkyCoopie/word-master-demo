import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("普通和稀有视为同一种稀有度；史诗和传说视为同一种稀有度；"),
  unlockPrerequisite: { type: "deckRarityKindsMin", min: 3 },
};

/** 效果由 `treasureRarityTierMerge.js` 与 `treasureLogicShared` 全局接入 */
