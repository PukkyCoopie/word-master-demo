/** @typedef {number | string} ScoreValue */

export const SCORE_MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

/** 倍率合并后乘到整数分上的定点缩放（10⁹） */
const MULT_SCALE = 1_000_000_000n;

/** 动画插值 t 的定点缩放 */
const LERP_SCALE = 1_000_000n;

/**
 * @param {ScoreValue | bigint | null | undefined} value
 * @returns {bigint} 非负整数
 */
export function parseScore(value) {
  if (value == null) return 0n;
  if (typeof value === "bigint") {
    return value < 0n ? 0n : value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || !/^-?\d+$/.test(trimmed)) return 0n;
    try {
      const bi = BigInt(trimmed);
      return bi < 0n ? 0n : bi;
    } catch {
      return 0n;
    }
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0n;
  if (Number.isSafeInteger(n)) return BigInt(n);
  return BigInt(Math.floor(n));
}

/**
 * @param {bigint} bi
 * @returns {ScoreValue}
 */
export function normalizeScore(bi) {
  if (bi <= 0n) return 0;
  if (bi <= SCORE_MAX_SAFE) return Number(bi);
  return bi.toString();
}

/**
 * 存档/网络读入：兼容旧档 number 与新档 string。
 * @param {ScoreValue | bigint | null | undefined} value
 * @returns {ScoreValue}
 */
export function deserializeScore(value) {
  return normalizeScore(parseScore(value));
}

/**
 * 存档写出：安全整数仍为 number，超大为 string。
 * @param {ScoreValue | bigint | null | undefined} value
 * @returns {ScoreValue}
 */
export function serializeScore(value) {
  return deserializeScore(value);
}

/**
 * @param {ScoreValue | bigint | null | undefined} a
 * @param {ScoreValue | bigint | null | undefined} b
 * @returns {ScoreValue}
 */
export function addScore(a, b) {
  return normalizeScore(parseScore(a) + parseScore(b));
}

/**
 * @param {ScoreValue | bigint | null | undefined} a
 * @param {ScoreValue | bigint | null | undefined} b
 * @returns {ScoreValue}
 */
export function subtractScore(a, b) {
  const diff = parseScore(a) - parseScore(b);
  return normalizeScore(diff < 0n ? 0n : diff);
}

/**
 * @param {ScoreValue | bigint | null | undefined} a
 * @param {ScoreValue | bigint | null | undefined} b
 * @returns {ScoreValue}
 */
export function scoreExcess(a, b) {
  return subtractScore(a, b);
}

/**
 * @param {ScoreValue | bigint | null | undefined} a
 * @param {ScoreValue | bigint | null | undefined} b
 * @returns {-1 | 0 | 1}
 */
export function compareScore(a, b) {
  const av = parseScore(a);
  const bv = parseScore(b);
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

/** @returns {boolean} */
export function scoreGte(a, b) {
  return compareScore(a, b) >= 0;
}

/** @returns {boolean} */
export function scoreGt(a, b) {
  return compareScore(a, b) > 0;
}

/** @returns {boolean} */
export function scoreLt(a, b) {
  return compareScore(a, b) < 0;
}

/** @returns {boolean} */
export function scoreLte(a, b) {
  return compareScore(a, b) <= 0;
}

/** @returns {boolean} */
export function scoreIsPositive(value) {
  return parseScore(value) > 0n;
}

/**
 * round(scoreSum × multTotal × treasureMult)
 * @param {ScoreValue | number | null | undefined} scoreSum
 * @param {number | null | undefined} multTotal
 * @param {number | null | undefined} [treasureMult=1]
 * @returns {ScoreValue}
 */
export function multiplyScoreRound(scoreSum, multTotal, treasureMult = 1) {
  const sum = parseScore(scoreSum);
  const m1 = Number(multTotal);
  const m2 = Number(treasureMult);
  if (!Number.isFinite(m1) || !Number.isFinite(m2)) return 0;
  const combined = m1 * m2;
  if (!Number.isFinite(combined) || combined <= 0) return 0;
  const scaledMult = BigInt(Math.round(combined * Number(MULT_SCALE)));
  if (scaledMult <= 0n) return 0;
  const half = MULT_SCALE / 2n;
  return normalizeScore((sum * scaledMult + half) / MULT_SCALE);
}

/**
 * ceil(score × factor)，factor 为 0~1 小数。
 * @param {ScoreValue | bigint | null | undefined} score
 * @param {number} factor
 * @returns {ScoreValue}
 */
export function ceilScoreProduct(score, factor) {
  const s = parseScore(score);
  const f = Number(factor);
  if (!Number.isFinite(f) || f <= 0 || s <= 0n) return 0;
  const scaled = BigInt(Math.round(f * Number(MULT_SCALE)));
  if (scaled <= 0n) return 0;
  return normalizeScore((s * scaled + MULT_SCALE - 1n) / MULT_SCALE);
}

/**
 * 顶栏滚分等线性插值。
 * @param {ScoreValue | bigint | null | undefined} start
 * @param {ScoreValue | bigint | null | undefined} end
 * @param {number} t 0..1
 * @returns {ScoreValue}
 */
export function interpolateScore(start, end, t) {
  const s = parseScore(start);
  const e = parseScore(end);
  const clamped = Math.max(0, Math.min(1, Number(t) || 0));
  if (clamped <= 0) return normalizeScore(s);
  if (clamped >= 1) return normalizeScore(e);
  const tScaled = BigInt(Math.round(clamped * Number(LERP_SCALE)));
  const diff = e - s;
  const half = LERP_SCALE / 2n;
  return normalizeScore(s + (diff * tScaled + half) / LERP_SCALE);
}

/**
 * 将正 bigint 四舍五入到两位有效数字（Balatro 无尽底分表用）。
 * @param {bigint} bi
 * @returns {bigint}
 */
export function roundBigIntToTwoSignificantDigits(bi) {
  if (bi <= 0n) return 0n;
  const s = bi.toString();
  if (s.length <= 2) return bi;
  let twoDigit = Number(s.slice(0, 2));
  const third = s.length > 2 ? Number(s[2]) : 0;
  if (third >= 5) twoDigit += 1;
  let exp = s.length - 2;
  if (twoDigit >= 100) {
    twoDigit = 10;
    exp += 1;
  }
  const tailZeros = Math.max(0, exp);
  return BigInt(String(twoDigit) + "0".repeat(tailZeros));
}

/**
 * 由 mantissa×10^exp 构造两位有效数字的 bigint（mantissa 约 1~9.9）。
 * @param {number} mantissa
 * @param {number} exp
 * @returns {bigint}
 */
export function scientificPartsToBigIntTwoSig(mantissa, exp) {
  const m = Number(mantissa);
  const e = Math.floor(Number(exp));
  if (!Number.isFinite(m) || m <= 0 || !Number.isFinite(e)) return 0n;
  let rounded = Math.round(m * 10) / 10;
  let adjustedExp = e;
  if (rounded >= 10) {
    rounded = 1;
    adjustedExp += 1;
  }
  const mantissaDigits = String(rounded).replace(".", "");
  const zeros = Math.max(0, adjustedExp - (mantissaDigits.length - 1));
  return BigInt(mantissaDigits + "0".repeat(zeros));
}

/**
 * 仅用于成就/排行榜等仍吃 number 的边界；超大时可能失精。
 * @param {ScoreValue | bigint | null | undefined} value
 * @returns {number}
 */
export function scoreToLegacyNumber(value) {
  const bi = parseScore(value);
  if (bi <= SCORE_MAX_SAFE) return Number(bi);
  return Number(bi);
}
