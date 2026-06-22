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

/**
 * 关卡 id → `levelIndex`（与 `getRunLevelAtIndex` 对称；无尽章如 9-1 亦可解析）。
 * @param {string} id 如 "1-1"、"8-3"
 * @returns {number | null}
 */
export function getRunLevelIndexForId(id) {
  const normalized = String(id ?? "").trim();
  if (!normalized) return null;
  const idx = LEVELS.findIndex((l) => l.id === normalized);
  if (idx >= 0) return idx;
  const m = /^(\d+)-(\d+)$/.exec(normalized);
  if (!m) return null;
  const chapter = Number(m[1]);
  const sub = Number(m[2]);
  if (
    !Number.isFinite(chapter) ||
    !Number.isFinite(sub) ||
    chapter < 1 ||
    sub < 1 ||
    sub > 3
  ) {
    return null;
  }
  const effective = (chapter - 1) * 3 + (sub - 1);
  return RUN_START_LEVEL_INDEX + effective;
}

/** 标准流程最后一关下标（8-3） */
export const STANDARD_RUN_FINAL_LEVEL_INDEX = LEVEL_COUNT - 1;

/** TODO(测试)：true = 通关 1-3 后整局胜利（下标 5）；测完改回 false */
const DEBUG_RUN_END_AFTER_CHAPTER_1 = false;

/** 1-3 在 LEVELS 中的下标（RUN_START_LEVEL_INDEX 起为 1-1） */
const CHAPTER_1_FINAL_LEVEL_INDEX = RUN_START_LEVEL_INDEX + 2;

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
  const i = Math.floor(Number(index)) || 0;
  if (DEBUG_RUN_END_AFTER_CHAPTER_1) return i === CHAPTER_1_FINAL_LEVEL_INDEX;
  return i === STANDARD_RUN_FINAL_LEVEL_INDEX;
}
