/** @param {number} n */
export function isDebtMoneyAmount(n) {
  return Math.round(Number(n) || 0) < 0;
}

/** 结算行：正数为重复 $，负数为 - 加 |n| 枚 $ */
export function settlementDollarMarks(n) {
  const v = Math.round(Number(n) || 0);
  if (v === 0) return "";
  if (v < 0) return `-${"$".repeat(Math.abs(v))}`;
  return "$".repeat(v);
}

/** @param {string} text 气泡展示文案（已 normalize） */
export function isDebtMoneyBubbleLabel(text) {
  const raw = String(text ?? "").trim();
  return raw.startsWith("-$");
}

/** @param {string | number} chipValue 简介 money chip 的数字部分 */
export function isDebtMoneyChipValue(chipValue) {
  const s = String(chipValue ?? "").trim();
  return s.startsWith("-");
}
