import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("稀有字母在计分时提供", score("+50"), "分数"),
  unlockPrerequisite: { type: "deckRareHalf" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, replayCounts } = ctx;
    let scoreAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      if (letterParts[i]?.rarity !== "rare") continue;
      const passes = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      scoreAdd += 50 * passes;
    }
    return scoreAdd > 0 ? { scoreAdd } : null;
  },
  getPerLetterScoreCue(_ctx, part) {
    return part?.rarity === "rare" ? { delta: 50, label: "+50" } : null;
  },
};
