import { describe, materialConcept, mult } from "../treasureDescription.js";
import { getMultMulBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

export const TREASURE_78_ID = "78";
const ID = TREASURE_78_ID;
export const TREASURE_78_ICE_SHATTER_MULT_INCREMENT = 1;
export const TREASURE_78_ICE_SHATTER_MULT_BUBBLE = "×1";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每当一个", materialConcept("ice"), "碎裂时，获得", mult("x1"), "倍率"),
  unlockPrerequisite: { type: "runIceMaterialShattered" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multMul"),
  buildPostLetterStep(ctx) {
    const m = getMultMulBank(ctx.treasureRun, TREASURE_78_ID, ctx);
    return m > 1 ? { multMul: m } : null;
  },
};
