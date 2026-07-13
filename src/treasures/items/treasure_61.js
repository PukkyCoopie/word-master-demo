import { describe, mult } from "../treasureDescription.js";
import { bankMultAddGain, getMultAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "61";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("每当你拼写一个带有相同的相邻字母的单词，获得", mult("+4"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multAdd"),
  buildPostLetterStep(ctx) {
    const v = getMultAddBank(ctx.treasureRun, ID, ctx);
    return v !== 0 ? { multAdd: v } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    const letters = ctx.submittedLetters ?? [];
    let streak = false;
    for (let i = 0; i < letters.length - 1; i++) {
      const a = String(letters[i]?.letter ?? "").toLowerCase();
      const b = String(letters[i + 1]?.letter ?? "").toLowerCase();
      if (a.length > 0 && a === b) {
        streak = true;
        break;
      }
    }
    if (streak) await bankMultAddGain(ctx, ID, 4);
  },
};
