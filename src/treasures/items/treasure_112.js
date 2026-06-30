import { describe, money, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "rare",
  unlockPrerequisite: { type: "everTwoTreasuresWithAccessory" },
  description: describe("你每有", money("5"), "，", mult("+2"), "倍率"),
};

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function patchMoneyMultDescription(ctx) {
  const money = Math.max(0, Math.floor(Number(ctx.money) || 0));
  const v = Math.floor(money / 5) * 2;
  return describe("（当前", mult(v >= 0 ? `+${v}` : String(v)), "）");
}

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  patchDescription: patchMoneyMultDescription,
  buildPostLetterStep(ctx) {
    const money = Math.max(0, Math.floor(Number(ctx.money) || 0));
    const v = Math.floor(money / 5) * 2;
    return v > 0 ? { multAdd: v } : null;
  },
};
