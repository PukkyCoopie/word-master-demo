/** 词长表默认等级（未升级 / 「0 级」） */
export const BASE_LENGTH_TABLE_LEVEL = 1;

/**
 * @param {number} judgedLen
 * @param {Record<string | number, number> | null | undefined} lengthLevelsByLength
 * @returns {number}
 */
export function getLengthTableLevel(judgedLen, lengthLevelsByLength) {
  const L = Math.max(0, Math.floor(Number(judgedLen)) || 0);
  const raw =
    lengthLevelsByLength?.[L] ??
    lengthLevelsByLength?.[String(L)];
  return Math.max(
    BASE_LENGTH_TABLE_LEVEL,
    Math.round(Number(raw)) || BASE_LENGTH_TABLE_LEVEL,
  );
}

/**
 * @param {number} actualLen 实际字母数
 * @param {(n: number) => number} getJudgedLengthTableLen
 * @returns {number}
 */
export function hintJudgedLengthForActual(actualLen, getJudgedLengthTableLen) {
  const n = Math.max(0, Math.floor(Number(actualLen)) || 0);
  if (typeof getJudgedLengthTableLen !== "function") return n;
  return getJudgedLengthTableLen(n);
}

/**
 * 反推：哪些实际词长在当前判定加成下映射到目标判定词长。
 * @param {number} judgedTarget
 * @param {(n: number) => number} getJudgedLengthTableLen
 * @param {number} minLen
 * @param {number} maxLen
 * @returns {number[]}
 */
export function actualLengthsForJudgedTarget(judgedTarget, getJudgedLengthTableLen, minLen, maxLen) {
  const target = Math.max(0, Math.floor(Number(judgedTarget)) || 0);
  const lo = Math.max(0, Math.floor(Number(minLen)) || 0);
  const hi = Math.max(lo, Math.floor(Number(maxLen)) || 0);
  /** @type {number[]} */
  const out = [];
  for (let L = lo; L <= hi; L += 1) {
    if (hintJudgedLengthForActual(L, getJudgedLengthTableLen) === target) out.push(L);
  }
  return out;
}

/**
 * @typedef {Object} HintLengthContext
 * @property {(n: number) => number} [getJudgedLengthTableLen]
 * @property {Record<string | number, number>} [lengthLevelsByLength]
 * @property {number} [maxActualLen]
 */

/**
 * @param {readonly { kind: 'exact', len: number, weight: number }[]} weights
 * @param {(len: number) => boolean} pred 实际词长是否保留
 * @returns {{ kind: 'exact', len: number, weight: number }[]}
 */
export function filterExactLengthWeights(weights, pred) {
  return weights
    .map((e) => ({
      ...e,
      weight: pred(e.len) ? e.weight : 0,
    }))
    .filter((e) => e.weight > 0);
}

/**
 * @param {GridCell} cell
 * @returns {string}
 */
export function hintWordStartLetterFromCell(cell) {
  const L = String(cell?.letter ?? "").trim().toLowerCase();
  if (!L) return "";
  return L === "qu" ? "q" : L.charAt(0);
}
