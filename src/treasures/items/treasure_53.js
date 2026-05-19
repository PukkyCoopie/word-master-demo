import { describe, mult } from "../treasureDescription.js";
import { addMultAddBank, getMultAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "53";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("每当组合包被跳过时，获得", mult("+3"), "倍率", "（当前+0）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multAdd"),
  buildPostLetterStep(ctx) {
    const v = getMultAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { multAdd: v } : null;
  },
  onPackSkipped(ctx) {
    addMultAddBank(ctx.treasureRun, ID, 3);
  },
};
