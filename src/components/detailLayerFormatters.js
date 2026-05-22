export function formatCompactOneDecimal(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  const s = n.toFixed(1);
  return s.endsWith(".0") ? String(Math.round(n)) : s;
}

export function formatWalletInteger(value) {
  return String(Math.max(0, Math.floor(Number(value) || 0)));
}

export function isSingleDigitLabel(label) {
  return /^\d$/.test(String(label ?? "").trim());
}
