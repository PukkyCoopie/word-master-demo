import { describe, mult } from "../treasureDescription.js";
import { bankMultAddGain, getMultAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "53";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("每当组合包被跳过时，获得", mult("+8"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multAdd"),
  buildPostLetterStep(ctx) {
    const v = getMultAddBank(ctx.treasureRun, ID, ctx);
    return v !== 0 ? { multAdd: v } : null;
  },
  async onPackSkipped(ctx) {
    await bankMultAddGain(ctx, ID, 8);
  },
};
