import { describe, mult } from "../treasureDescription.js";
import { isVowelLetterWithMask } from "../treasureLetterClassify.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("每一个拼写的辅音字母给予", mult("+4"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, ownedSlotTreasureIds, replayCounts } = ctx;
    const slots = ownedSlotTreasureIds ?? [];
    let multAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      const ch = String(letterParts[i]?.letter ?? "").toLowerCase();
      if (!ch || isVowelLetterWithMask(ch, slots)) continue;
      const r = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      multAdd += 4 * r;
    }
    return multAdd > 0 ? { multAdd } : null;
  },
  getPerLetterMultCue(ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    const slots = ctx.ownedSlotTreasureIds ?? [];
    if (!letter || isVowelLetterWithMask(letter, slots)) return null;
    return { delta: 4, label: "+4" };
  },
};
