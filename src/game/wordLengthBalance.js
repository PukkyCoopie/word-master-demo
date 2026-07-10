/**
 * 词长平衡表（3–16）及超长外推。
 *
 * ## 判定词长
 * - 下限仍为 3（`normalizeJudgedWordLength`）。
 * - 无上限：实际字母数 + 净判定加成可超过 16。
 *
 * ## 表内（3 ≤ L ≤ 16）
 * 直接查 `WORD_LENGTH_BALANCE`。
 *
 * ## 表外（L > 16）基础值外推
 * 首段步长与 15→16 一致（每字基础分 +36、长度倍率 +20），之后每多 1 字母步长再 +4：
 * - 16→17：+36 / +20
 * - 17→18：+40 / +24
 * - 18→19：+44 / +28
 * - 19→20：+48 / +32
 * 设 k = L − 16，累计增量 = k×首步 + 2k(k−1)（分数首步 36，倍率首步 20）。
 *
 * ## 表外升级与望远镜
 * L > 16 时等级、每级增量、望远镜额外均按 **长度 16** 查表（不单独为 17+ 存等级）。
 */

/** 词长表可查范围下限 */
export const WORD_LENGTH_TABLE_MIN = 3;

/** 词长表可查范围上限（升级/等级仅存于此段） */
export const WORD_LENGTH_TABLE_MAX = 16;

/**
 * 统一长度平衡常量（3~16）：
 * - base: [基础分, 基础倍率]
 * - upgrade: [每升一级增加的分数, 每升一级增加的倍率]
 */
export const WORD_LENGTH_BALANCE = {
  3: { base: [5, 4], upgrade: [4, 3] },
  4: { base: [6, 5], upgrade: [4, 4] },
  5: { base: [7, 6], upgrade: [5, 4] },
  6: { base: [8, 7], upgrade: [5, 5] },
  7: { base: [10, 9], upgrade: [6, 5] },
  8: { base: [12, 12], upgrade: [6, 6] },
  9: { base: [15, 15], upgrade: [8, 8] },
  10: { base: [20, 18], upgrade: [10, 9] },
  11: { base: [27, 21], upgrade: [13, 11] },
  12: { base: [36, 25], upgrade: [18, 13] },
  13: { base: [48, 30], upgrade: [24, 15] },
  14: { base: [64, 42], upgrade: [32, 21] },
  15: { base: [84, 60], upgrade: [42, 30] },
  16: { base: [120, 80], upgrade: [60, 40] },
};

const B16 = WORD_LENGTH_BALANCE[16];

/** 16→17 外推首步：每字基础分 */
export const WORD_LENGTH_EXTRAP_SCORE_STEP_INITIAL = 36;

/** 16→17 外推首步：长度倍率 */
export const WORD_LENGTH_EXTRAP_MULT_STEP_INITIAL = 20;

/** 表外每多跨 1 字母，步长对分数与倍率各再 +4 */
export const WORD_LENGTH_EXTRAP_STEP_GROWTH = 4;

/**
 * 表外累计增量：k 步（L=16+k）时 sum_{j=0}^{k-1} (initial + growth×j)
 * @param {number} k
 * @param {number} initial
 */
function extrapCumulativeDelta(k, initial) {
  const steps = Math.max(0, Math.floor(Number(k)) || 0);
  if (steps <= 0) return 0;
  return steps * initial + WORD_LENGTH_EXTRAP_STEP_GROWTH * (steps * (steps - 1)) / 2;
}

/**
 * 判定词长：仅保留下限 3，无上限。
 * @param {number} len
 */
export function normalizeJudgedWordLength(len) {
  const L = Math.round(Number(len)) || 0;
  return L <= 0 ? WORD_LENGTH_TABLE_MIN : L < WORD_LENGTH_TABLE_MIN ? WORD_LENGTH_TABLE_MIN : L;
}

/**
 * 升级/等级/望远镜查表用词长（封顶 16）。
 * @param {number} judgedLen 已 normalize 的判定词长
 */
export function getLengthUpgradeLookupKey(judgedLen) {
  const L = normalizeJudgedWordLength(judgedLen);
  return L > WORD_LENGTH_TABLE_MAX ? WORD_LENGTH_TABLE_MAX : L;
}

/**
 * 词长升级、`bumpWordLengthLevel` 等：判定词长映射到可升级槽位（3–16）。
 * @param {number} judgedLen
 * @returns {number | null} 3–16，或无效时 null
 */
export function resolveLengthUpgradeLen(judgedLen) {
  const raw = Math.round(Number(judgedLen)) || 0;
  if (raw < WORD_LENGTH_TABLE_MIN) return null;
  return getLengthUpgradeLookupKey(normalizeJudgedWordLength(raw));
}

/**
 * @param {number} judgedLen
 * @returns {number}
 */
export function getLengthBalanceBaseScore(judgedLen) {
  const L = normalizeJudgedWordLength(judgedLen);
  if (L <= WORD_LENGTH_TABLE_MAX) {
    return Number(WORD_LENGTH_BALANCE[L]?.base?.[0]) || 0;
  }
  const k = L - WORD_LENGTH_TABLE_MAX;
  return Number(B16.base[0]) + extrapCumulativeDelta(k, WORD_LENGTH_EXTRAP_SCORE_STEP_INITIAL);
}

/**
 * @param {number} judgedLen
 * @returns {number}
 */
export function getLengthBalanceBaseMult(judgedLen) {
  const L = normalizeJudgedWordLength(judgedLen);
  if (L <= WORD_LENGTH_TABLE_MAX) {
    return Number(WORD_LENGTH_BALANCE[L]?.base?.[1]) || 0;
  }
  const k = L - WORD_LENGTH_TABLE_MAX;
  return Number(B16.base[1]) + extrapCumulativeDelta(k, WORD_LENGTH_EXTRAP_MULT_STEP_INITIAL);
}
