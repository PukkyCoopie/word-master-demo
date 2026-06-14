import { describe, mult } from "../treasureDescription.js";
import { addMultMulBank, getMultMulBank, playBankMultMulGainFx } from "../treasureBankHelpers.js";

const DISCARD_26_MULT_INCREMENT = 1;

const ID = "115";
const LETTERS_PER_STEP = 26;

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function buildLaundryBasketDescription(ctx) {
  const rs = ctx.treasureRun;
  const v = rs ? getMultMulBank(rs, ID) : 1;
  const shown = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
  return describe(
    "你每弃掉26个字母块，便获得",
    mult("x1"),
    "倍率",
    "（当前",
    mult(`x${shown || "1"}`),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "legendary",
  shopEligible: false,
  description: describe("你每弃掉26个字母块，便获得", mult("x1"), "倍率", "（当前", mult("x1"), "）"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: buildLaundryBasketDescription,
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  async onDiscardBatch(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const n = Math.max(0, Math.floor(Number(ctx.letterCount) || 0));
    if (n <= 0) return;
    // runLettersDiscardedTotal 在 onDiscardBatch 之前已含本批 n，勿再 +n
    const after = Math.max(0, Math.floor(Number(rs.runLettersDiscardedTotal) || 0));
    const before = Math.max(0, after - n);
    const stepsBefore = Math.floor(before / LETTERS_PER_STEP);
    const stepsAfter = Math.floor(after / LETTERS_PER_STEP);
    const delta = stepsAfter - stepsBefore;
    if (delta <= 0) return;
    for (let i = 0; i < delta; i += 1) addMultMulBank(rs, ID, DISCARD_26_MULT_INCREMENT);
    await playBankMultMulGainFx(ctx, ID, "×1");
  },
};
