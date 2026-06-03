import { describe, mult } from "../treasureDescription.js";
import { addMultMulBank, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

export const TREASURE_78_ID = "78";
const ID = TREASURE_78_ID;
export const TREASURE_78_ICE_SHATTER_MULT_INCREMENT = 0.75;
export const TREASURE_78_ICE_SHATTER_MULT_BUBBLE = "×0.75";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每当一个碎冰块碎裂时，获得", mult("x0.75"), "倍率"),
  unlockPrerequisite: { type: "deckIceMin", min: 5 },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, ID);
    return m > 1 ? { multMul: m } : null;
  },
  onIceMaterialBreak(ctx) {
    if (ctx.iceShatterTreasureFxHandled) return;
    addMultMulBank(ctx.treasureRun, ID, TREASURE_78_ICE_SHATTER_MULT_INCREMENT);
  },
};
