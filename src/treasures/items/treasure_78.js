import { describe, mult } from "../treasureDescription.js";
import { bankMultMulGain, getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "78";

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
  async onIceMaterialBreak(ctx) {
    await bankMultMulGain(ctx, ID, 1.75, "×0.75");
  },
};
