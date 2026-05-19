import { describe, score } from "../treasureDescription.js";
import { addScoreAddBank, getScoreAddBank } from "../treasureBankHelpers.js";
import {
  letterInCurrentDiscardGroup,
  rollDiscardLetterGroupIndex,
} from "../treasureRunState.js";

const ID = "65";
const SCORE_PER_MATCHING_DISCARD = 3;

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function buildPotteryJarDescription(ctx) {
  const g = String(ctx.discardLetterGroup ?? "abcde").toUpperCase();
  const rs = ctx.treasureRun;
  const v = rs ? Math.round(getScoreAddBank(rs, ID)) : 0;
  const bankLabel = v >= 0 ? `+${v}` : String(v);
  return describe(
    `每当你弃掉一张${g}，获得`,
    score("+3"),
    "分数，字母每关都会变化",
    "（当前",
    score(bankLabel),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(
    "每当你弃掉一张abcde，获得",
    score("+3"),
    "分数，字母每关都会变化",
    "（当前",
    score("+0"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: buildPotteryJarDescription,
  buildPostLetterStep(ctx) {
    const v = getScoreAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { scoreAdd: v } : null;
  },
  onDiscardBatch(ctx) {
    if (ctx.discardPotteryFxHandled) return;
    const rs = ctx.treasureRun;
    if (!rs) return;
    for (const p of ctx.discardedLetters ?? []) {
      if (!letterInCurrentDiscardGroup(p?.letter, rs)) continue;
      addScoreAddBank(rs, ID, SCORE_PER_MATCHING_DISCARD);
    }
  },
  async onLevelComplete(ctx) {
    const ix = ctx.findOwnedTreasureSlotIndex?.(ID) ?? -1;
    if (ix < 0 || !ctx.treasureRun) return;
    const rnd = typeof ctx.rng === "function" ? ctx.rng : Math.random;
    rollDiscardLetterGroupIndex(ctx.treasureRun, rnd);
    await ctx.wobbleOwnedTreasureById?.(ID);
  },
};
