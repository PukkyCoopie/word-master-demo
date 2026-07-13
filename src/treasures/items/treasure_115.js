import { describe, mult } from "../treasureDescription.js";
import {
  addMultMulBank,
  assignOwnedSlotTreasureBank,
  canMutateTreasureBankFromCtx,
  formatMultMulBankGainLabel,
  getMultMulBank,
  playBankMultMulGainFx,
  readTreasureBankSnapshot,
} from "../treasureBankHelpers.js";

const DISCARD_26_MULT_INCREMENT = 1;

const ID = "115";
const LETTERS_PER_STEP = 26;

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function isOwnedLaundryBasketCtx(ctx) {
  if (ctx?.slotIndex == null || !Number.isFinite(ctx.slotIndex)) return false;
  const slots = Array.isArray(ctx.ownedSlotTreasureIds) ? ctx.ownedSlotTreasureIds : [];
  return String(slots[Math.floor(Number(ctx.slotIndex))] ?? "") === ID;
}

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function discardProgressFromCtx(ctx) {
  const bank = readTreasureBankSnapshot(ctx?.treasureRun, ID, ctx);
  const n = Math.max(0, Math.floor(Number(bank?.posPackProgress) || 0));
  return Math.min(LETTERS_PER_STEP, n);
}

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function discardRemainingFromCtx(ctx) {
  const progress = discardProgressFromCtx(ctx);
  return Math.max(1, LETTERS_PER_STEP - progress);
}

/** @param {string} shown */
function laundryBasketCurrentMultLine(shown) {
  return [{ type: "br" }, "（当前", mult(`x${shown || "1"}`), "）"];
}

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function buildLaundryBasketDescription(ctx) {
  const rs = ctx.treasureRun;
  const v = rs ? getMultMulBank(ctx.treasureRun, ID, ctx) : 1;
  const shown = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
  if (isOwnedLaundryBasketCtx(ctx)) {
    const remaining = discardRemainingFromCtx(ctx);
    return describe(
      `你每弃掉26个字母块（还差${remaining}个），便获得`,
      mult("x1"),
      "倍率",
      ...laundryBasketCurrentMultLine(shown),
    );
  }
  return describe(
    "你每弃掉26个字母块，便获得",
    mult("x1"),
    "倍率",
    ...laundryBasketCurrentMultLine(shown),
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "legendary",
  shopEligible: false,
  description: describe(
    "你每弃掉26个字母块，便获得",
    mult("x1"),
    "倍率",
    ...laundryBasketCurrentMultLine("1"),
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: buildLaundryBasketDescription,
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID, ctx);
    return m > 1 ? { multMul: m } : null;
  },
  async onDiscardBatch(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const n = Math.max(0, Math.floor(Number(ctx.letterCount) || 0));
    if (n <= 0) return;
    if (!canMutateTreasureBankFromCtx(ctx, ID)) return;
    const bank = readTreasureBankSnapshot(rs, ID, ctx);
    const before = Math.max(0, Math.floor(Number(bank?.posPackProgress) || 0));
    const after = before + n;
    const delta = Math.floor(after / LETTERS_PER_STEP);
    const remainder = after % LETTERS_PER_STEP;
    assignOwnedSlotTreasureBank(ctx, ID, { posPackProgress: remainder });
    if (delta <= 0) return;
    for (let i = 0; i < delta; i += 1) addMultMulBank(rs, ID, DISCARD_26_MULT_INCREMENT, ctx);
    await playBankMultMulGainFx(ctx, ID, formatMultMulBankGainLabel(DISCARD_26_MULT_INCREMENT));
  },
};
