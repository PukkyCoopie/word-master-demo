export function formatCompactOneDecimal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  const s = n.toFixed(1);
  return s.endsWith(".0") ? String(Math.round(n)) : s;
}

/** 至多两位小数；整数不显示小数，0.5 不补零为 0.50 */
export function formatCompactUpToTwoDecimals(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  const rounded = Math.round(n * 100) / 100;
  if (Math.abs(rounded - Math.round(rounded)) < 1e-6) return String(Math.round(rounded));
  return rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function formatWalletInteger(value) {
  return String(Math.floor(Number(value) || 0));
}

export function isSingleDigitLabel(label) {
  return /^\d$/.test(String(label ?? "").trim());
}
