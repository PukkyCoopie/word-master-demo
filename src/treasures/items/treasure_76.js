import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("所有字母在记分时永久获得", mult("+1"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  accumulateReplaySubmitAdjustments(ctx) {
    const { letterParts, replayCounts } = ctx;
    let multAdd = 0;
    for (let i = 0; i < letterParts.length; i++) {
      const r = 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0));
      multAdd += 1 * r;
    }
    return multAdd > 0 ? { multAdd } : null;
  },
  getPerLetterMultCue() {
    return { delta: 1, label: "+1" };
  },
  /** 与单字母本体倍率同节拍，避免单独再播 +1 一步 */
  mergeLetterMultCueIntoIntrinsicLetterMultStep: true,
  persistTileAfterPerLetterTreasureCue(ctx) {
    if (ctx.band !== "mult" || !ctx.realTile || typeof ctx.realTile !== "object") return false;
    const d = Math.max(0, Math.round(Number(ctx.delta) || 0));
    if (d <= 0) return false;
    const t = ctx.realTile;
    const v = Math.max(0, Math.round(Number(t.letterMultBonus) || 0)) + d;
    t.letterMultBonus = v;
    const c = t._deckCard;
    if (c && typeof c === "object") c.letterMultBonus = v;
    return true;
  },
};
