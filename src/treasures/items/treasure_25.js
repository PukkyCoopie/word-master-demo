import { describe, mult, score } from "../treasureDescription.js";

/** 与简介「A,B,C,E,H,M,U」一致；改效果时请同步改此集合与 description 文案 */
const MEMO_LETTER_SET = new Set(["a", "b", "c", "e", "h", "m", "u"]);
const MEMO_SCORE = 10;
const MEMO_MULT = 4;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "rare",
  description: describe(
    "A,B,C,E,H,M,U给予",
    score("+10"),
    "分数和",
    mult("+4"),
    "倍率",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, replayCounts } = ctx;
    let scoreAdd = 0;
    let multAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      const ch = String(letterParts[i]?.letter ?? "").toLowerCase();
      if (!ch || !MEMO_LETTER_SET.has(ch)) continue;
      const r = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      scoreAdd += MEMO_SCORE * r;
      multAdd += MEMO_MULT * r;
    }
    return scoreAdd > 0 || multAdd > 0 ? { scoreAdd, multAdd } : null;
  },
  getPerLetterScoreCue(_ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    if (!letter || !MEMO_LETTER_SET.has(letter)) return null;
    return { delta: MEMO_SCORE, label: "+10" };
  },
  getPerLetterMultCue(_ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    if (!letter || !MEMO_LETTER_SET.has(letter)) return null;
    return { delta: MEMO_MULT, label: "+4" };
  },
};
