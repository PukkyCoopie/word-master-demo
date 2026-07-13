import { describe, mult } from "../treasureDescription.js";
import { bankMultMulGain, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "66";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 9,
  rarity: "epic",
  description: describe("每当你卖出宝藏时，获得", mult("x0.2"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID, ctx);
    return m > 1 ? { multMul: m } : null;
  },
  async onTreasureSold(ctx) {
    if (ctx.soldTreasureId === ID) return;
    await bankMultMulGain(ctx, ID, 0.2, "×0.2");
  },
};
