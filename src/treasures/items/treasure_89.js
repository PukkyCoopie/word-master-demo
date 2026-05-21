import { describe, mult } from "../treasureDescription.js";
import { multiplyMultMulBank, patchCurrentBankDescription, playBankMultMulGainFx } from "../treasureBankHelpers.js";

const ID = "89";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "common",
  description: describe("每当一个字母被加入你的牌库，获得", mult("x0.25"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = ctx.treasureRun?.banks?.[ID]?.multMul ?? 1;
    return m > 1 ? { multMul: m } : null;
  },
  async onDeckCardsAdded(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.count) || 0));
    if (n <= 0) return;
    for (let i = 0; i < n; i += 1) multiplyMultMulBank(ctx.treasureRun, ID, 1.25);
    await playBankMultMulGainFx(ctx, ID, "×0.25");
  },
};
