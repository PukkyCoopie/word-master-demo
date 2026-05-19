import { describe, mult, score } from "../treasureDescription.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe(
    "每一个s在计分时提供",
    score("+5"),
    "分数和",
    mult("+5"),
    "倍率",
    "；每一个z在计分时提供",
    score("+2"),
    "分数和",
    mult("x2"),
    "倍率",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const parts = ctx.letterParts ?? [];
    let multMul = 1;
    for (const p of parts) {
      if (normalizeLetterChar(p?.letter) === "z") multMul *= 2;
    }
    return multMul > 1 ? { multMul } : null;
  },
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, replayCounts } = ctx;
    let scoreAdd = 0;
    let multAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      const ch = normalizeLetterChar(letterParts[i]?.letter);
      const passes = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      if (ch === "s") {
        scoreAdd += 5 * passes;
        multAdd += 5 * passes;
      } else if (ch === "z") {
        scoreAdd += 2 * passes;
      }
    }
    if (scoreAdd <= 0 && multAdd <= 0) return null;
    return { scoreAdd: scoreAdd > 0 ? scoreAdd : undefined, multAdd: multAdd > 0 ? multAdd : undefined };
  },
  getPerLetterScoreCue(_ctx, part) {
    const ch = normalizeLetterChar(part?.letter);
    if (ch === "s") return { delta: 5, label: "+5" };
    if (ch === "z") return { delta: 2, label: "+2" };
    return null;
  },
  getPerLetterMultCue(_ctx, part) {
    const ch = normalizeLetterChar(part?.letter);
    if (ch === "s") return { delta: 5, label: "+5" };
    if (ch === "z") return { delta: 2, label: "x2" };
    return null;
  },
};
