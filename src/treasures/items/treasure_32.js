import { describe, score } from "../treasureDescription.js";
import { isVowelLetterWithMask } from "../treasureLetterClassify.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("每一个拼写的元音字母给予", score("+40"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, ownedSlotTreasureIds, replayCounts } = ctx;
    const slots = ownedSlotTreasureIds ?? [];
    let scoreAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      const ch = String(letterParts[i]?.letter ?? "").toLowerCase();
      if (!ch || !isVowelLetterWithMask(ch, slots)) continue;
      const r = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      scoreAdd += 40 * r;
    }
    return scoreAdd > 0 ? { scoreAdd } : null;
  },
  getPerLetterScoreCue(ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    const slots = ctx.ownedSlotTreasureIds ?? [];
    if (!letter || !isVowelLetterWithMask(letter, slots)) return null;
    return { delta: 40, label: "+40" };
  },
};
