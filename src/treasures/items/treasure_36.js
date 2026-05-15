import { describe, mult, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("字母E在记分时给予", score("+20"), "分数和", mult("+4"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, replayCounts } = ctx;
    let scoreAdd = 0;
    let multAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      const ch = String(letterParts[i]?.letter ?? "").toLowerCase();
      if (ch !== "e") continue;
      const r = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      scoreAdd += 20 * r;
      multAdd += 4 * r;
    }
    return scoreAdd > 0 || multAdd > 0 ? { scoreAdd, multAdd } : null;
  },
  getPerLetterScoreCue(_ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    if (letter !== "e") return null;
    return { delta: 20, label: "+20" };
  },
  getPerLetterMultCue(_ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    if (letter !== "e") return null;
    return { delta: 4, label: "+4" };
  },
};
