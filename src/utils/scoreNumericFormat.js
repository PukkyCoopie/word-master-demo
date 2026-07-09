/** 科学计数法 mantissa 最多小数位（历史兼容） */
export const SCORE_SCI_NOTATION_MAX_DECIMALS = 8;
export const SCORE_SCI_NOTATION_MIN_DECIMALS = 1;

/** 相对 CSS 基准字号的最小缩放（历史兼容，现行规则不再缩字号） */
export const SCORE_MIN_FONT_SCALE = 0.5;

/** locale 千分位保持基准字号的最大有效位数（含 100,000,000） */
export const SCORE_LOCALE_FULL_SIZE_MAX_DIGITS = 9;

/**
 * 绝对值 ≥ 此阈值（10 位有效数字）时改用科学计数法，字号回到基准。
 */
export const SCORE_DIRECT_SCIENTIFIC_ABS_THRESHOLD = 1_000_000_000;

/** 科学计数法 mantissa 小数位 */
export const SCORE_DIRECT_SCIENTIFIC_DECIMALS = 5;

import { parseScore } from "./scoreInteger.js";

/**
 * @typedef {{
 *   text: string,
 *   fontScale: number,
 *   scientific: boolean,
 *   wrapped: boolean,
 * }} ScoreNumericPresentation
 */

/**
 * @param {bigint} absBi 非负整数
 * @returns {number}
 */
export function countScoreIntegerDigitsBigInt(absBi) {
  if (absBi <= 0n) return 0;
  return absBi.toString().length;
}

/**
 * @param {bigint} absBi
 * @returns {number}
 */
export function estimateLocaleIntegerTextLengthBigInt(absBi) {
  const digits = countScoreIntegerDigitsBigInt(absBi);
  if (digits <= 0) return 1;
  return digits + Math.floor((digits - 1) / 3);
}

/** @deprecated 保留测试兼容；大数请走 parseScore */
export function countScoreIntegerDigits(absRounded) {
  return countScoreIntegerDigitsBigInt(parseScore(absRounded));
}

/** @deprecated 保留测试兼容 */
export function estimateLocaleIntegerTextLength(absRounded) {
  return estimateLocaleIntegerTextLengthBigInt(parseScore(absRounded));
}

/**
 * @param {import('./scoreInteger.js').ScoreValue | bigint | number | null | undefined} value
 * @returns {bigint} 非负绝对值
 */
function parseScoreMagnitude(value) {
  if (value == null) return 0n;
  if (typeof value === "bigint") return value < 0n ? -value : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || !/^-?\d+$/.test(trimmed)) return 0n;
    try {
      const bi = BigInt(trimmed);
      return bi < 0n ? -bi : bi;
    } catch {
      return 0n;
    }
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 0n;
  return BigInt(Math.floor(Math.abs(n)));
}

/**
 * @param {import('./scoreInteger.js').ScoreValue | bigint | number | null | undefined} value
 * @returns {boolean}
 */
export function shouldFormatScoreAsScientificDirect(value) {
  const bi = parseScoreMagnitude(value);
  if (bi === 0n) return false;
  return countScoreIntegerDigitsBigInt(bi) > SCORE_LOCALE_FULL_SIZE_MAX_DIGITS;
}

/**
 * @param {import('./scoreInteger.js').ScoreValue | bigint | null | undefined} value
 * @returns {string}
 */
export function formatScoreScientificDirect(value) {
  return formatScoreScientificNotationBigInt(parseScore(value), SCORE_DIRECT_SCIENTIFIC_DECIMALS);
}

/**
 * @param {bigint} bi
 */
export function formatScoreIntegerLocaleBigInt(bi) {
  if (bi === 0n) return "0";
  const sign = bi < 0n ? "-" : "";
  const s = (bi < 0n ? -bi : bi).toString();
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += ",";
    out += s[i];
  }
  return `${sign}${out}`;
}

/**
 * @param {number | import('./scoreInteger.js').ScoreValue | bigint | null | undefined} n
 */
export function formatScoreIntegerLocale(n) {
  return formatScoreIntegerLocaleBigInt(parseScore(n));
}

/**
 * @param {bigint} value 非负整数
 * @param {number} decimalPlaces
 */
export function formatScoreScientificNotationBigInt(value, decimalPlaces) {
  const bi = value < 0n ? -value : value;
  if (bi === 0n) return "0";

  const sign = value < 0n ? "-" : "";
  const s = bi.toString();
  const exp = s.length - 1;
  const dp = Math.max(0, Math.min(12, Math.floor(Number(decimalPlaces) || 0)));

  let mantissaStr;
  if (dp <= 0) {
    mantissaStr = s[0];
  } else {
    const fracDigits = s.slice(1, 1 + dp).padEnd(dp, "0");
    mantissaStr = `${s[0]}.${fracDigits}`;
  }

  const expPart = exp >= 0 ? `e+${exp}` : `e${exp}`;
  return `${sign}${mantissaStr}${expPart}`;
}

/**
 * @param {number} value 已四舍五入的整数
 * @param {number} decimalPlaces
 */
export function formatScoreScientificNotation(value, decimalPlaces) {
  return formatScoreScientificNotationBigInt(parseScore(value), decimalPlaces);
}

/**
 * 按数量级解析展示文案与字号：≤9 位 locale 基准字号；≥10 位科学计数法且基准字号。
 *
 * @param {import('./scoreInteger.js').ScoreValue | bigint | null | undefined} value
 * @param {{ singleLine?: boolean }} [_options] 保留兼容，规则与顶栏一致
 * @returns {ScoreNumericPresentation}
 */
export function resolveScoreNumericPresentation(value, _options = {}) {
  const n = Number(value);
  const negative = typeof value === "string" ? value.trim().startsWith("-") : Number.isFinite(n) && n < 0;
  const bi = parseScoreMagnitude(value);

  if (bi === 0n) {
    return { text: "0", fontScale: 1, scientific: false, wrapped: false };
  }

  if (shouldFormatScoreAsScientificDirect(bi)) {
    const text = formatScoreScientificNotationBigInt(bi, SCORE_DIRECT_SCIENTIFIC_DECIMALS);
    return {
      text: negative ? `-${text.replace(/^-/, "")}` : text,
      fontScale: 1,
      scientific: true,
      wrapped: false,
    };
  }

  const localeText = formatScoreIntegerLocaleBigInt(bi);
  return {
    text: negative ? `-${localeText}` : localeText,
    fontScale: 1,
    scientific: false,
    wrapped: false,
  };
}

/**
 * result-box：科学计数法时锁到 max 宽。
 * @param {import('./scoreInteger.js').ScoreValue | bigint | null | undefined} _value
 * @param {ScoreNumericPresentation} presentation
 */
export function shouldLockScoreResultBoxWidth(_value, presentation) {
  return presentation.scientific === true;
}

/**
 * 展示参数指纹：相同则无需写 DOM（计分逐拍 refit 时可跳过）。
 * @param {ScoreNumericPresentation} presentation
 * @param {boolean} [boxLocked]
 */
export function scoreNumericPresentationKey(presentation, boxLocked = false) {
  return `${presentation.text}|${presentation.fontScale}|${presentation.scientific ? 1 : 0}|${presentation.wrapped ? 1 : 0}|${boxLocked ? 1 : 0}`;
}

/**
 * 静态文案用整数分展示：≤9 位 locale 千分位，≥10 位科学计数法（与顶栏 ScoreCardValue 规则一致）。
 *
 * @param {import('./scoreInteger.js').ScoreValue | bigint | number | null | undefined} value
 * @returns {string}
 */
export function formatIntegerScoreForDisplay(value) {
  return resolveScoreNumericPresentation(value).text;
}

/**
 * @param {string} word
 * @param {import('./scoreInteger.js').ScoreValue | bigint | number | null | undefined} score
 * @returns {string}
 */
export function formatWordWithScoreLabel(word, score) {
  const w = String(word ?? "").trim();
  if (!w) return "—";
  return `${w.toUpperCase()}（${formatIntegerScoreForDisplay(score)}）`;
}
