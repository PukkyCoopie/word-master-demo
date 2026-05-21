import { describe, mult } from "../treasureDescription.js";
import { bankMultMulGain, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "66";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 9,
  rarity: "epic",
  description: describe(
    "每当你卖出宝藏时，获得",
    mult("x0.25"),
    "倍率",
    "，在每个大关完成后重置",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  async onTreasureSold(ctx) {
    if (ctx.soldTreasureId === ID) return;
    await bankMultMulGain(ctx, ID, 1.25, "×0.25");
  },
  onChapterEnter(ctx) {
    if (!ctx.treasureRun) return;
    ctx.treasureRun.banks[ID] = { multAdd: 0, multMul: 1, scoreAdd: 0 };
  },
};
