import { describe } from "../treasureDescription.js";
import { isVowelLetterWithMask } from "../treasureLetterClassify.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("重新触发所有的辅音字母"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterReplayCountForLetter(ctx, part, _letterIndex) {
    const letter = String(part?.letter ?? "").toLowerCase();
    if (!letter) return 0;
    if (isVowelLetterWithMask(letter, ctx.ownedSlotTreasureIds)) return 0;
    return 1;
  },
};
