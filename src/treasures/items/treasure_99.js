import { describe, mult } from "../treasureDescription.js";
import { addMultMulBank, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";
import { ensureTreasureBank } from "../treasureRunState.js";

export const TREASURE_99_ID = "99";
const ID = TREASURE_99_ID;
const TRASH_CAN_E_MULT_INCREMENT = 0.25;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe("在本关卡中，你每弃掉一个E，获得", mult("x0.25"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  onLevelEnter(ctx) {
    if (!ctx.treasureRun) return;
    ensureTreasureBank(ctx.treasureRun, ID).multMul = 1;
  },
  onDiscardBatch(ctx) {
    if (ctx.discardPotteryFxHandled) return;
    const rs = ctx.treasureRun;
    if (!rs) return;
    for (const p of ctx.discardedLetters ?? []) {
      const ch = String(p?.letter ?? "").toLowerCase();
      if (ch === "e") addMultMulBank(rs, ID, TRASH_CAN_E_MULT_INCREMENT);
    }
  },
};
