import { describe, score } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("所有字母在记分时永久获得", score("+4"), "分数"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, replayCounts } = ctx;
    let scoreAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      const r = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      scoreAdd += 4 * r;
    }
    return scoreAdd > 0 ? { scoreAdd } : null;
  },
  getPerLetterScoreCue() {
    return { delta: 4, label: "+4" };
  },
  /** 与单字母本体分数同节拍，避免单独再播 +4 一步 */
  mergeLetterScoreCueIntoIntrinsicLetterScoreStep: true,
  persistTileAfterPerLetterTreasureCue(ctx) {
    if (ctx.band !== "score" || !ctx.realTile || typeof ctx.realTile !== "object") return false;
    const d = Math.max(0, Math.floor(Number(ctx.delta) || 0));
    if (d <= 0) return false;
    const t = ctx.realTile;
    const v = Math.max(0, Math.floor(Number(t.tileScoreBonus) || 0)) + d;
    t.tileScoreBonus = v;
    const c = t._deckCard;
    if (c && typeof c === "object") c.tileScoreBonus = v;
    return true;
  },
};
