import { describe, materialConcept, score } from "../treasureDescription.js";
import {
  addScoreAddBank,
  getScoreAddBank,
} from "../treasureBankHelpers.js";
import {
  countTreasureHookContributionPaths,
  iterTreasureHookContributions,
  shouldTreasureRunAccumulationMutate,
} from "../../game/treasureBlueprintMirror.js";

const ID = "143";
const SCORE_PER_WATER = 10;
const WATER_MATERIAL_ID = "water";

/**
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 */
function countWaterMaterialScoringVisits(ctx) {
  const parts = ctx?.letterParts;
  if (!Array.isArray(parts)) return 0;
  const replayRow = ctx?.replayCounts ?? ctx?.letterReplayCounts;
  let visits = 0;
  for (let i = 0; i < parts.length; i++) {
    if (String(parts[i]?.materialId ?? "") !== WATER_MATERIAL_ID) continue;
    const replay = Array.isArray(replayRow)
      ? Math.max(0, Math.floor(Number(replayRow[i]) || 0))
      : 0;
    visits += 1 + replay;
  }
  return visits;
}

/**
 * 提交算分：按字母顺序模拟银行累加（首遍 + replay），计入 flatScoreAdd。
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 */
function computeWaterWaveScoreForSubmit(ctx) {
  const parts = ctx?.letterParts;
  if (!Array.isArray(parts)) return 0;
  const replayRow = ctx?.replayCounts ?? ctx?.letterReplayCounts;
  const owned = ctx?.ownedSlotTreasureIds ?? [];
  const paths = countTreasureHookContributionPaths(owned, ID);
  if (paths <= 0) return 0;

  let bank = Math.max(0, Math.floor(getScoreAddBank(ctx?.treasureRun, ID)));
  let scoreAdd = 0;

  for (let i = 0; i < parts.length; i++) {
    if (String(parts[i]?.materialId ?? "") !== WATER_MATERIAL_ID) continue;
    const replay = Array.isArray(replayRow)
      ? Math.max(0, Math.floor(Number(replayRow[i]) || 0))
      : 0;
    const visits = 1 + replay;
    for (let v = 0; v < visits; v++) {
      scoreAdd += bank;
      bank += SCORE_PER_WATER * paths;
    }
  }
  return scoreAdd;
}

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function patchWaterWaveDescription(ctx) {
  const v = Math.round(getScoreAddBank(ctx.treasureRun, ID, ctx));
  return describe(
    materialConcept("water"),
    "在计分后还会使之后",
    materialConcept("water"),
    "获得",
    score("+10"),
    "分数",
    "（当前",
    score(v >= 0 ? `+${v}` : String(v)),
    "）",
  );
}

/**
 * 逐字动画：每个实体贡献路径各 +10 入银行（蓝图镜像不写银行）。
 * @param {import('../treasureTypes.js').TreasureLogicContext} ctx
 */
function depositWaterWaveBankPerTrigger(ctx) {
  const owned = ctx?.ownedSlotTreasureIds ?? [];
  const rs = ctx?.treasureRun;
  if (!rs) return;
  for (const { slotIndex: si, treasureId: tid, source } of iterTreasureHookContributions(owned)) {
    if (tid !== ID) continue;
    if (!shouldTreasureRunAccumulationMutate(owned, si, ID, source)) continue;
    addScoreAddBank(rs, ID, SCORE_PER_WATER, {
      ownedSlotTreasureIds: owned,
      hookSlotIndex: si,
      hookSource: source,
    });
  }
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "rare",
  unlockPrerequisite: { type: "deckWaterMin", min: 2 },
  description: describe(
    materialConcept("water"),
    "在计分后还会使之后",
    materialConcept("water"),
    "获得",
    score("+10"),
    "分数",
    "（当前",
    score("+0"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: patchWaterWaveDescription,
  /** 平面分由 {@link accumulateReplaySubmitAdjustments} 统一汇总，避免 replay 环重复计入 */
  replaySubmitScoreAdjustmentsOwnsPerLetterScore: true,
  /** 同宝藏多路径时逐字 cue 只合并一次（银行加成），入账仍按路径数次 +10 */
  dedupePerLetterScoreCueByTreasureId: true,
  accumulateReplaySubmitAdjustments(ctx) {
    const scoreAdd = computeWaterWaveScoreForSubmit(ctx);
    return scoreAdd > 0 ? { scoreAdd } : null;
  },
  getPerLetterScoreCue(ctx, part) {
    if (String(part?.materialId ?? "") !== WATER_MATERIAL_ID) return null;
    const bank = Math.max(0, Math.floor(getScoreAddBank(ctx?.treasureRun, ID)));
    depositWaterWaveBankPerTrigger(ctx);
    if (bank <= 0) return null;
    return { delta: bank, label: `+${bank}` };
  },
  mergeLetterScoreCueIntoIntrinsicLetterScoreStep: true,
};

export {
  computeWaterWaveScoreForSubmit,
  countWaterMaterialScoringVisits,
  depositWaterWaveBankPerTrigger,
  SCORE_PER_WATER,
  WATER_MATERIAL_ID,
};
