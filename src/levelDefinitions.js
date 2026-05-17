/**
 * 关卡与经济奖励。
 *
 * `id`：关卡名（如 "1-1"）。
 * 通关目标分 = List of Antes 章底 × 1× / 1.5× / Boss 倍数，见 `game/levelTargetScore.js`。
 * `rewardYuan`：通关基础奖励（元）；同一大关下小关 1→3、2→4、3→5。
 */

import { resolveLevelTargetScore } from "./game/levelTargetScore.js";

/** @typedef {{ id: string, rewardYuan: number }} LevelDefinition */

/**
 * @param {string} id
 * @returns {number}
 */
export function rewardYuanForLevelId(id) {
  const parts = String(id).split("-");
  const sub = Number(parts[1]);
  if (sub === 1) return 3;
  if (sub === 2) return 4;
  if (sub === 3) return 5;
  return 3;
}

/** @type {readonly string[]} 0-1 … 0-3（卷轴券回退大关）+ 1-1 … 8-3 */
const LEVEL_IDS = Object.freeze([
  "0-1",
  "0-2",
  "0-3",
  ...Array.from({ length: 8 * 3 }, (_, i) => {
    const chapter = Math.floor(i / 3) + 1;
    const sub = (i % 3) + 1;
    return `${chapter}-${sub}`;
  }),
]);

/** 新局 `levelIndex`：从 1-1 起，跳过 Ante 0 */
export const RUN_START_LEVEL_INDEX = 3;

/** @type {readonly LevelDefinition[]} 按通关顺序排列 */
export const LEVELS = Object.freeze(
  LEVEL_IDS.map((id) => ({
    id,
    rewardYuan: rewardYuanForLevelId(id),
  })),
);

export const LEVEL_COUNT = LEVELS.length;

/**
 * 关卡 id → 目标分（Boss 关未传 slug 时按 m=1）
 * @type {Readonly<Record<string, number>>}
 */
export const LEVEL_TARGET_BY_ID = Object.freeze(
  Object.fromEntries(LEVELS.map((l) => [l.id, resolveLevelTargetScore(l.id, "")])),
);

/**
 * @param {string} id
 * @param {string} [bossSlugForSub3=""]
 * @returns {number}
 */
export { resolveLevelTargetScore } from "./game/levelTargetScore.js";

/**
 * @param {string} id
 * @returns {LevelDefinition | undefined}
 */
export function getLevelById(id) {
  return LEVELS.find((l) => l.id === id);
}

/**
 * @param {number} index 0-based，与 LEVELS 顺序一致
 * @returns {LevelDefinition | undefined}
 */
export function getLevelByIndex(index) {
  return LEVELS[index];
}

/** 标准流程最后一关下标（8-3） */
export const STANDARD_RUN_FINAL_LEVEL_INDEX = LEVEL_COUNT - 1;

/**
 * @param {number} index 0-based 通关顺序下标（可超过 LEVEL_COUNT−1 表示无尽后续关）
 * @returns {LevelDefinition}
 */
export function getRunLevelAtIndex(index) {
  const i = Math.max(0, Math.floor(Number(index)) || 0);
  if (i < LEVEL_COUNT) return LEVELS[i];
  const effective = i - RUN_START_LEVEL_INDEX;
  const chapter = Math.floor(effective / 3) + 1;
  const sub = (effective % 3) + 1;
  const id = `${chapter}-${sub}`;
  return { id, rewardYuan: rewardYuanForLevelId(id) };
}

/**
 * @param {number} index
 * @returns {boolean}
 */
export function isStandardRunFinalLevelIndex(index) {
  return Math.floor(Number(index)) === STANDARD_RUN_FINAL_LEVEL_INDEX;
}
