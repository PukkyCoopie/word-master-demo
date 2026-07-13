import { describe, mult } from "../treasureDescription.js";
import { addMultMulBank, getMultMulBank } from "../treasureBankHelpers.js";

const ID = "62";
const START_MULT_MUL = 2;

/** @param {number} v */
function formatMultMulBankShown(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return "1";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function buildMagnetDescription(ctx) {
  const rs = ctx.treasureRun;
  const hasSlotCtx = typeof ctx.slotIndex === "number";
  const current = hasSlotCtx ? getMultMulBank(rs, ID, ctx) : START_MULT_MUL;
  const shown = formatMultMulBankShown(current);
  return describe(
    mult("x2"),
    "倍率",
    "，每弃掉1个字母损失0.01",
    "（当前",
    mult(`x${shown}`),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe(
    mult("x2"),
    "倍率",
    "，每弃掉1个字母损失0.01",
    "（当前",
    mult("x2"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: buildMagnetDescription,
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID, ctx);
    return m > 1 ? { multMul: m } : null;
  },
  onDiscardBatch(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.letterCount) || 0));
    if (n <= 0 || !ctx.treasureRun) return;
    addMultMulBank(ctx.treasureRun, ID, -0.01 * n, ctx);
  },
  isTreasureEffectDepleted(ctx) {
    return getMultMulBank(ctx.treasureRun, ID, ctx) <= 1;
  },
};
