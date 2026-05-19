import { describe, mult } from "../treasureDescription.js";
import { getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { ensureTreasureBank } from "../treasureRunState.js";

const ID = "62";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(mult("x2"), "倍率", "，每弃掉1个字母损失0.01", "（当前x2）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  onDiscardBatch(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.letterCount) || 0));
    if (n <= 0 || !ctx.treasureRun) return;
    ensureTreasureBank(ctx.treasureRun, ID).multMul *= 0.99 ** n;
  },
};
