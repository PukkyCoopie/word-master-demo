/** 科学计数法 mantissa 最多小数位（从多到少尝试，以默认字号单行容纳为准） */
export const SCORE_SCI_NOTATION_MAX_DECIMALS = 8;
export const SCORE_SCI_NOTATION_MIN_DECIMALS = 1;

/**
 * @param {number} n
 */
export function formatScoreIntegerLocale(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString();
}

/**
 * @param {number} value 已四舍五入的整数
 * @param {number} decimalPlaces
 */
export function formatScoreScientificNotation(value, decimalPlaces) {
  const rounded = Math.round(Number(value) || 0);
  if (!Number.isFinite(rounded) || rounded === 0) return "0";

  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const exp = Math.floor(Math.log10(abs));
  const mantissa = abs / Math.pow(10, exp);
  const dp = Math.max(0, Math.min(12, Math.floor(Number(decimalPlaces) || 0)));

  let mantissaStr = mantissa.toFixed(dp);
  mantissaStr = mantissaStr.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");

  const expPart = exp >= 0 ? `e+${exp}` : `e${exp}`;
  return `${sign}${mantissaStr}${expPart}`;
}
