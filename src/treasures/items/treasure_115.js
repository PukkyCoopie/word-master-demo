import { describe, mult } from "../treasureDescription.js";
import { addMultMulBank, getMultMulBank, patchCurrentBankDescription, playBankMultMulGainFx } from "../treasureBankHelpers.js";

const DISCARD_26_MULT_INCREMENT = 1;

const ID = "115";
const LETTERS_PER_STEP = 26;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 0,
  rarity: "legendary",
  shopEligible: false,
  description: describe("你每弃掉26个字母块，便获得", mult("x1"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  async onDiscardBatch(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const n = Math.max(0, Math.floor(Number(ctx.letterCount) || 0));
    if (n <= 0) return;
    const before = Math.max(0, Math.floor(Number(rs.runLettersDiscardedTotal) || 0));
    const stepsBefore = Math.floor(before / LETTERS_PER_STEP);
    const stepsAfter = Math.floor((before + n) / LETTERS_PER_STEP);
    const delta = stepsAfter - stepsBefore;
    if (delta <= 0) return;
    for (let i = 0; i < delta; i += 1) addMultMulBank(rs, ID, DISCARD_26_MULT_INCREMENT);
    await playBankMultMulGainFx(ctx, ID, "×1");
  },
};
