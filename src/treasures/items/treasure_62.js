import { describe, mult } from "../treasureDescription.js";
import { getMultMulBank } from "../treasureBankHelpers.js";
import { ensureTreasureBank } from "../treasureRunState.js";

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
  const current = rs?.banks?.[ID] != null ? getMultMulBank(rs, ID) : START_MULT_MUL;
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
  price: 6,
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
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  onDiscardBatch(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.letterCount) || 0));
    if (n <= 0 || !ctx.treasureRun) return;
    ensureTreasureBank(ctx.treasureRun, ID).multMul *= 0.99 ** n;
  },
};
