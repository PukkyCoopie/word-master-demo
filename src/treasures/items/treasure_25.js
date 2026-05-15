import { describe, mult } from "../treasureDescription.js";

/** 与简介「A,B,C,E,H,M,U」一致；改效果时请同步改此集合与 description 文案 */
const MEMO_MULT_LETTER_SET = new Set(["a", "b", "c", "e", "h", "m", "u"]);

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe("每一个拼写的A,B,C,E,H,M,U给予", mult("+4"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, replayCounts } = ctx;
    let multAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      const ch = String(letterParts[i]?.letter ?? "").toLowerCase();
      if (!ch || !MEMO_MULT_LETTER_SET.has(ch)) continue;
      const r = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      multAdd += 4 * r;
    }
    return multAdd > 0 ? { multAdd } : null;
  },
  getPerLetterMultCue(_ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    if (!letter || !MEMO_MULT_LETTER_SET.has(letter)) return null;
    return { delta: 4, label: "+4" };
  },
};
