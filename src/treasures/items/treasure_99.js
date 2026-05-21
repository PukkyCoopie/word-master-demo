import { describe, mult } from "../treasureDescription.js";
import { getMultMulBank, multiplyMultMulBank, patchCurrentBankDescription, playBankMultMulGainFx } from "../treasureBankHelpers.js";
import { ensureTreasureBank } from "../treasureRunState.js";

const ID = "99";

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
  async onDiscardBatch(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    let n = 0;
    for (const p of ctx.discardedLetters ?? []) {
      const ch = String(p?.letter ?? "").toLowerCase();
      if (ch === "e") n += 1;
    }
    if (n <= 0) return;
    for (let i = 0; i < n; i += 1) multiplyMultMulBank(rs, ID, 1.25);
    await playBankMultMulGainFx(ctx, ID, "×0.25");
  },
};
