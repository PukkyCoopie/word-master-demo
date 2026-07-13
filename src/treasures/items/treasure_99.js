import { describe, mult } from "../treasureDescription.js";
import { isTreasureHookBlueprintMirror } from "../../game/treasureBlueprintMirror.js";
import {
  addMultMulBank,
  assignOwnedSlotTreasureBank,
  canMutateTreasureBankFromCtx,
  formatMultMulBankGainLabel,
  getMultMulBank,
  patchCurrentBankDescription,
} from "../treasureBankHelpers.js";

export const TREASURE_99_ID = "99";
const ID = TREASURE_99_ID;
const TRASH_CAN_E_MULT_INCREMENT = 0.25;
export const TREASURE_99_E_MULT_GAIN_BUBBLE = formatMultMulBankGainLabel(TRASH_CAN_E_MULT_INCREMENT);

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("你每弃掉一个E，获得", mult("x0.25"), "倍率", "，倍率在关卡结束时重置"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID, ctx);
    return m > 1 ? { multMul: m } : null;
  },
  onLevelComplete(ctx) {
    if (isTreasureHookBlueprintMirror(ctx) || !canMutateTreasureBankFromCtx(ctx, ID)) return;
    assignOwnedSlotTreasureBank(ctx, ID, { multMul: 1 });
  },
  onDiscardBatch(ctx) {
    if (ctx.discardPotteryFxHandled || ctx.discardSkateboardFxHandled) return;
    const rs = ctx.treasureRun;
    if (!rs) return;
    for (const p of ctx.discardedLetters ?? []) {
      const ch = String(p?.letter ?? "").toLowerCase();
      if (ch === "e") addMultMulBank(rs, ID, TRASH_CAN_E_MULT_INCREMENT, ctx);
    }
  },
};
