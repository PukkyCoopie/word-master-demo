import { describe, mult } from "../treasureDescription.js";
import { addMultMulBank, getMultMulBank, patchCurrentBankDescription, playBankMultMulGainFx } from "../treasureBankHelpers.js";

const VOWEL_REMOVED_MULT_INCREMENT = 0.5;

const ID = "113";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "legendary",
  shopEligible: false,
  description: describe("每当你从牌库中移除1张元音字母，获得", mult("x0.5"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  async onDeckCardsRemoved(ctx) {
    const n = Math.max(0, Math.floor(Number(ctx.vowelsRemoved) || 0));
    if (n <= 0 || !ctx.treasureRun) return;
    for (let i = 0; i < n; i += 1) addMultMulBank(ctx.treasureRun, ID, VOWEL_REMOVED_MULT_INCREMENT);
    await playBankMultMulGainFx(ctx, ID, "×0.5");
  },
};
