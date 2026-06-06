import { describe, money } from "../treasureDescription.js";

const DEBT_LIMIT_DOLLARS = 20;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 1,
  rarity: "common",
  description: describe("你可以负债", money(String(DEBT_LIMIT_DOLLARS))),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getWalletFloor() {
    return -DEBT_LIMIT_DOLLARS;
  },
};
