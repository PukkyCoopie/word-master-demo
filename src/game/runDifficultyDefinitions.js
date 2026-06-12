/** @typedef {Object} RunDifficultyDef
 * @property {number} index 0..8
 * @property {string} label UI 显示名，如「难度1」
 * @property {string} color 背景色 hex
 * @property {string} textColor 文字色
 * @property {string} description 本级新增效果（单行简介）
 */

/** @type {readonly RunDifficultyDef[]} */
const DIFFICULTIES = Object.freeze([
  {
    index: 0,
    label: "难度0",
    color: "#e5e5e5",
    textColor: "#555555",
    description: "开局拥有$5，所需分数降低25%",
  },
  {
    index: 1,
    label: "难度1",
    color: "#f5f5f0",
    textColor: "#3c3a32",
    description: "普通难度",
  },
  {
    index: 2,
    label: "难度2",
    color: "#5b8fd4",
    textColor: "#ffffff",
    description: "每个关卡提供的奖励降低$1",
  },
  {
    index: 3,
    label: "难度3",
    color: "#4a9c6d",
    textColor: "#ffffff",
    description: "所需分数提高速度变快",
  },
  {
    index: 4,
    label: "难度4",
    color: "#d4b84a",
    textColor: "#ffffff",
    description: "宝藏有30%的概率带有禁售配饰（不能被卖出或摧毁）",
  },
  {
    index: 5,
    label: "难度5",
    color: "#e08a3a",
    textColor: "#ffffff",
    description: "-1 丢弃次数",
  },
  {
    index: 6,
    label: "难度6",
    color: "#c94a4a",
    textColor: "#ffffff",
    description: "所需分数提高速度变得更快",
  },
  {
    index: 7,
    label: "难度7",
    color: "#7a52c6",
    textColor: "#ffffff",
    description: "宝藏有30%的概率带有沙漏配饰（在5个关卡后失效）",
  },
  {
    index: 8,
    label: "难度8",
    color: "#2a2a2a",
    textColor: "#ffffff",
    description: "宝藏有30%的概率带有租赁配饰（花费$1元购买，但每关扣除$3）",
  },
]);

export const RUN_DIFFICULTY_COUNT = DIFFICULTIES.length;

/** @type {readonly RunDifficultyDef[]} */
export const RUN_DIFFICULTY_DEFINITIONS = DIFFICULTIES;

/** @type {ReadonlyMap<number, RunDifficultyDef>} */
export const RUN_DIFFICULTIES_BY_INDEX = new Map(DIFFICULTIES.map((d) => [d.index, d]));

export const DEFAULT_RUN_DIFFICULTY_INDEX = 0;

/** @param {number | null | undefined} index */
export function normalizeRunDifficultyIndex(index) {
  const n = Math.floor(Number(index) || 0);
  if (n >= 0 && n < RUN_DIFFICULTY_COUNT) return n;
  return DEFAULT_RUN_DIFFICULTY_INDEX;
}

/** @param {number | null | undefined} index */
export function getRunDifficultyDef(index) {
  return RUN_DIFFICULTIES_BY_INDEX.get(normalizeRunDifficultyIndex(index)) ?? RUN_DIFFICULTY_DEFINITIONS[0];
}

/** @param {number | null | undefined} index */
export function getRunDifficultyLabel(index) {
  return getRunDifficultyDef(index).label;
}

/** @param {number | null | undefined} index */
export function getRunDifficultyColor(index) {
  return getRunDifficultyDef(index).color;
}

/** @param {number | null | undefined} index */
export function getRunDifficultyTextColor(index) {
  return getRunDifficultyDef(index).textColor;
}
