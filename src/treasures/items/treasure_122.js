import { describe, handDelta, riskText } from "../treasureDescription.js";
import {
  assignOwnedSlotTreasureBank,
  canMutateTreasureBankFromCtx,
  readTreasureBankSnapshot,
} from "../treasureBankHelpers.js";

const ID = "122";
const LEVELS_TOTAL = 3;

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext | import('../treasureTypes.js').TreasureLogicContext} ctx */
function levelsRemainingFromCtx(ctx) {
  const bank = readTreasureBankSnapshot(ctx?.treasureRun, ID, ctx);
  return Math.max(0, Math.floor(Number(bank?.posPackProgress) || 0));
}

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function ownsLadder(ctx) {
  const slots = Array.isArray(ctx.ownedSlotTreasureIds) ? ctx.ownedSlotTreasureIds : [];
  return slots.some((tid) => String(tid ?? "") === ID);
}

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function levelsLeft(ctx) {
  const n = levelsRemainingFromCtx(ctx);
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
    return levelsRemainingFromCtx(ctx) > 0 ? 2 : 0;
  },
  isTreasureEffectDepleted(ctx) {
    return levelsRemainingFromCtx(ctx) <= 0;
  },
  onLevelComplete(ctx) {
    if (!canMutateTreasureBankFromCtx(ctx, ID)) return;
    const left = levelsRemainingFromCtx(ctx);
    if (left <= 0) return;
    assignOwnedSlotTreasureBank(ctx, ID, { posPackProgress: left - 1 });
  },
};
