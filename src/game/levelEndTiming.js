import { slotHasActiveHourglass } from "./treasureHourglassRuntime.js";
import {
  isTreasureHookContributionActive,
  iterTreasureHookContributions,
} from "./treasureBlueprintMirror.js";
import { getSubmitScoringBeatSpeed } from "./submitScoringTiming.js";
import { scoreExcess } from "../utils/scoreInteger.js";

/** 已实现 onLevelComplete 的宝藏 id（与 items 目录同步） */
const LEVEL_COMPLETE_HOOK_IDS = new Set([
  "27",
  "29",
  "41",
  "54",
  "83",
  "94",
  "99",
  "104",
  "106",
  "121",
  "122",
  "131",
  "132",
  "133",
  "137",
]);

/** 关卡结束 hook 较少时，拼词曲线几乎不加速；补底速避免 wobble/气泡拖尾过长 */
const LEVEL_END_SPEED_FLOOR_TIERS = [
  { maxTotal: 2, floor: 1.55 },
  { maxTotal: 4, floor: 1.35 },
  { maxTotal: 5, floor: 1.2 },
];

/** 与拼词计分共用渐进加速曲线，短序列额外抬高底速 */
export function getLevelEndBeatSpeed(beatIndex, totalBeats) {
  const submitSpeed = getSubmitScoringBeatSpeed(beatIndex, totalBeats);
  let floor = 1;
  for (const tier of LEVEL_END_SPEED_FLOOR_TIERS) {
    if (totalBeats <= tier.maxTotal) {
      floor = tier.floor;
      break;
    }
  }
  return Math.max(floor, submitSpeed);
}

/** 无动画 / 仅写 run 银行的 hook */
const LEVEL_COMPLETE_HOOK_BEAT_WEIGHT = {
  "83": 0,
  "99": 0,
  "122": 0,
  /** 火山：单拍 hook 前奏 + 喷发主体 */
  "54": 8,
  /** 炸弹：并发 wobble + shrink */
  "29": 4,
  /** 金钱 + 可能「提升」链 */
  "132": 2,
};

/**
 * @param {string} treasureId
 * @param {import('../treasures/treasureTypes.js').TreasureLevelCompleteContext} [estimateCtx]
 */
export function estimateLevelCompleteHookBeatWeight(treasureId, estimateCtx) {
  const tid = String(treasureId ?? "");
  if (!tid || !LEVEL_COMPLETE_HOOK_IDS.has(tid)) return 0;
  if (tid === "137") {
    const excess = scoreExcess(estimateCtx?.currentScore, estimateCtx?.targetScore);
    return excess > 0n ? 1 : 0;
  }
  const mapped = LEVEL_COMPLETE_HOOK_BEAT_WEIGHT[tid];
  if (mapped != null) return mapped;
  return 1;
}

/**
 * @param {readonly (Record<string, unknown> | null)[]} ownedSlots
 */
export function countHourglassStageEndBeats(ownedSlots) {
  let c = 0;
  for (const slot of ownedSlots ?? []) {
    if (slotHasActiveHourglass(slot)) c += 1;
  }
  return c;
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('../treasures/treasureTypes.js').TreasureLevelCompleteContext} [estimateCtx]
 */
export function countLevelCompleteHookBeats(ownedSlotTreasureIds, estimateCtx) {
  let c = 0;
  for (const entry of iterTreasureHookContributions(ownedSlotTreasureIds ?? [])) {
    if (!isTreasureHookContributionActive(ownedSlotTreasureIds, entry)) continue;
    c += estimateLevelCompleteHookBeatWeight(entry.treasureId, estimateCtx);
  }
  return c;
}

/**
 * @param {readonly (Record<string, unknown> | null)[]} ownedSlots
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('../treasures/treasureTypes.js').TreasureLevelCompleteContext} [estimateCtx]
 */
export function estimateLevelEndAnimBeats(ownedSlots, ownedSlotTreasureIds, estimateCtx) {
  const hourglassBeats = countHourglassStageEndBeats(ownedSlots);
  const hookBeats = countLevelCompleteHookBeats(ownedSlotTreasureIds, estimateCtx);
  return {
    hourglassBeats,
    hookBeats,
    totalBeats: hourglassBeats + hookBeats,
  };
}

/**
 * @param {number} hourglassBeats
 * @param {number} hookBeats
 */
export function createLevelEndBeatState(hourglassBeats, hookBeats) {
  let beatIndex = 0;
  let totalBeats = Math.max(0, hourglassBeats + hookBeats);
  let currentSpeed = 1;

  return {
    get currentSpeed() {
      return currentSpeed;
    },
    get beatIndex() {
      return beatIndex;
    },
    get totalBeats() {
      return totalBeats;
    },
    advanceBeat() {
      currentSpeed = getLevelEndBeatSpeed(beatIndex, totalBeats);
      beatIndex += 1;
      return currentSpeed;
    },
    /** @param {number} n */
    addBeats(n) {
      totalBeats += Math.max(0, Math.floor(Number(n) || 0));
    },
  };
}
