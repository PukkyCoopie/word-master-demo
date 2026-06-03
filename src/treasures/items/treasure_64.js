import { describe } from "../treasureDescription.js";

const KNOB_WORDS_TOTAL = 10;
const TREASURE_ID = "64";

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 * @returns {number}
 */
function resolveKnobWordsRemaining(ctx) {
  const n = Math.max(0, Math.floor(Number(ctx.extraLetterScoreWordsRemaining) || 0));
  if (n > 0) return n;
  const slots = Array.isArray(ctx.ownedSlotTreasureIds) ? ctx.ownedSlotTreasureIds : [];
  const ownsKnob = slots.some((id) => String(id ?? "") === TREASURE_ID);
  return ownsKnob ? 0 : KNOB_WORDS_TOTAL;
}

function buildKnobDescription(ctx) {
  const n = resolveKnobWordsRemaining(ctx);
  return describe(
    "你接下来的10个单词都会额外触发一次字母计分",
    `（还剩${n}个）`,
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(
    "你接下来的10个单词都会额外触发一次字母计分",
    "（还剩10个）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    return buildKnobDescription(ctx);
  },
  getExtraLetterScoringPasses(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.extraLetterScoreWordsRemaining <= 0) return 0;
    return 1;
  },
  onSuccessfulWordSubmit(ctx) {
    const rs = ctx.treasureRun;
    if (!rs || rs.extraLetterScoreWordsRemaining <= 0) return;
    rs.extraLetterScoreWordsRemaining -= 1;
  },
};
