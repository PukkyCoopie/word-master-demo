/**
 * 关卡难度与经济奖励。
 *
 * `id`：关卡名（如 "1-1"）。
 * `targetScore`：累计得分达到即通关。
 * `rewardYuan`：通关基础奖励（元）；规则：同一大关下小关 1→3、2→4、3→5。
 */

/** @typedef {{ id: string, targetScore: number, rewardYuan: number }} LevelDefinition */

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

const LEVELS_BASE = [
  { id: "1-1", targetScore: 100 },
  { id: "1-2", targetScore: 200 },
  { id: "1-3", targetScore: 400 },
  { id: "2-1", targetScore: 800 },
  { id: "2-2", targetScore: 1200 },
  { id: "2-3", targetScore: 2000 },
  { id: "3-1", targetScore: 3000 },
  { id: "3-2", targetScore: 4500 },
  { id: "3-3", targetScore: 6000 },
  { id: "4-1", targetScore: 9000 },
  { id: "4-2", targetScore: 12000 },
  { id: "4-3", targetScore: 18000 },
  { id: "5-1", targetScore: 24000 },
  { id: "5-2", targetScore: 36000 },
  { id: "5-3", targetScore: 48000 },
  { id: "6-1", targetScore: 72000 },
  { id: "6-2", targetScore: 108000 },
  { id: "6-3", targetScore: 150000 },
  { id: "7-1", targetScore: 200000 },
  { id: "7-2", targetScore: 300000 },
  { id: "7-3", targetScore: 400000 },
  { id: "8-1", targetScore: 500000 },
  { id: "8-2", targetScore: 750000 },
  { id: "8-3", targetScore: 1000000 },
];

/** @type {readonly LevelDefinition[]} 按通关顺序排列 */
export const LEVELS = Object.freeze(
  LEVELS_BASE.map((l) => ({
    ...l,
    rewardYuan: rewardYuanForLevelId(l.id),
  })),
);

export const LEVEL_COUNT = LEVELS.length;

/** 关卡 id → 目标分（便于 O(1) 查询） */
export const LEVEL_TARGET_BY_ID = Object.freeze(
  Object.fromEntries(LEVELS.map((l) => [l.id, l.targetScore])),
);

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
