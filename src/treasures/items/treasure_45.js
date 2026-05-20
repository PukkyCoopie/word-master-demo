import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("所有列出的概率翻倍"),
  unlockPrerequisite: { type: "probabilityEffectTriggered" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {};
