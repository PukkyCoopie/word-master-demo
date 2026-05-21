import { describe, mult } from "../treasureDescription.js";
import { bankMultAddGain, getMultAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "60";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe(mult("+25"), "倍率", "；每拼写一个单词", mult("-5"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multAdd"),
  buildPostLetterStep(ctx) {
    const v = getMultAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { multAdd: v } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    await bankMultAddGain(ctx, ID, -5);
  },
};
