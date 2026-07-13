import { describe } from "../treasureDescription.js";
import {
  addScoreAddBank,
  getScoreAddBank,
} from "../treasureBankHelpers.js";

const KNOB_WORDS_TOTAL = 10;
const TREASURE_ID = "64";

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 * @returns {number}
 */
function resolveKnobWordsRemaining(ctx) {
  const fromBank = Math.max(0, Math.floor(getScoreAddBank(ctx.treasureRun, TREASURE_ID, ctx)));
  if (fromBank > 0) return fromBank;
  if (typeof ctx.slotIndex === "number" && Array.isArray(ctx.ownedTreasureInstances)) {
    const slot = ctx.ownedTreasureInstances[ctx.slotIndex];
    if (slot && String(slot.treasureId ?? "") === TREASURE_ID) return 0;
  }
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
    const remaining = Math.max(0, Math.floor(getScoreAddBank(ctx.treasureRun, TREASURE_ID, ctx)));
    return remaining > 0 ? 1 : 0;
  },
  onSuccessfulWordSubmit(ctx) {
    const remaining = Math.max(0, Math.floor(getScoreAddBank(ctx.treasureRun, TREASURE_ID, ctx)));
    if (remaining <= 0) return;
    addScoreAddBank(ctx.treasureRun, TREASURE_ID, -1, ctx);
  },
  isTreasureEffectDepleted(ctx) {
    return Math.max(0, Math.floor(getScoreAddBank(ctx.treasureRun, TREASURE_ID, ctx))) <= 0;
  },
};
