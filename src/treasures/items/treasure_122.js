import { describe, handDelta, riskText } from "../treasureDescription.js";
import { ensureTreasureBank } from "../treasureRunState.js";

const ID = "122";
const LEVELS_TOTAL = 3;

/** @param {import('../treasureRunState.js').TreasureRunState | null | undefined} treasureRun */
function levelsRemainingFromRun(treasureRun) {
  const v = treasureRun?.banks?.[ID]?.posPackProgress;
  return Math.max(0, Math.floor(Number(v) || 0));
}

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function ownsLadder(ctx) {
  const slots = Array.isArray(ctx.ownedSlotTreasureIds) ? ctx.ownedSlotTreasureIds : [];
  return slots.some((tid) => String(tid ?? "") === ID);
}

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function levelsLeft(ctx) {
  const v = ctx.treasureRun?.banks?.[ID]?.posPackProgress;
  const n = Math.max(0, Math.floor(Number(v) || 0));
  if (n > 0) return n;
  return ownsLadder(ctx) ? 0 : LEVELS_TOTAL;
}

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function buildLadderDescription(ctx) {
  const left = levelsLeft(ctx);
  if (left <= 0 && ownsLadder(ctx)) {
    return describe(
      "你的单词视为",
      handDelta("+2"),
      "的长度，持续3个关卡",
      { type: "br" },
      riskText("（已失效）"),
    );
  }
  return describe(
    "你的单词视为",
    handDelta("+2"),
    `的长度，持续3个关卡（还剩${left}个关卡）`,
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe(
    "你的单词视为",
    handDelta("+2"),
    "的长度，持续3个关卡（还剩3个关卡）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    return buildLadderDescription(ctx);
  },
  getSubmitLengthBonus(ctx) {
    return levelsRemainingFromRun(ctx.treasureRun) > 0 ? 2 : 0;
  },
  isTreasureEffectDepleted(ctx) {
    return levelsRemainingFromRun(ctx.treasureRun) <= 0;
  },
  onLevelComplete(ctx) {
    const rs = ctx.treasureRun;
    if (!rs) return;
    const left = levelsRemainingFromRun(rs);
    if (left <= 0) return;
    ensureTreasureBank(rs, ID).posPackProgress = left - 1;
  },
};
