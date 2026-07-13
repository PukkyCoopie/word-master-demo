import { describe, mult } from "../treasureDescription.js";
import { bankMultAddGain, getMultAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "60";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe(mult("+30"), "倍率", "；每拼写一个单词", mult("-5"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multAdd", "+0", { multAdd: 30 }),
  buildPostLetterStep(ctx) {
    const v = getMultAddBank(ctx.treasureRun, ID, ctx);
    return v !== 0 ? { multAdd: v } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    await bankMultAddGain(ctx, ID, -5);
  },
  isTreasureEffectDepleted(ctx) {
    return getMultAddBank(ctx.treasureRun, ID, ctx) <= 0;
  },
};
