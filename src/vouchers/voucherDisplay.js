/**
 * @param {{ tier: number, emoji: string, nameStem: string }} def
 * @param {{ pairHasTier2Owned: boolean, showTier1Suffix?: boolean }} opts
 */
export function formatVoucherDisplayName(def, opts) {
  const tier = Math.max(1, Math.floor(Number(def.tier) || 1));
  const stem = String(def.nameStem ?? "").trim();
  const em = String(def.emoji ?? "").trim();
  const base = `${em}${stem}`;
  if (tier === 2) return `${base}·二级`;
  const pairHas2 = Boolean(opts?.pairHasTier2Owned);
  if (pairHas2 && opts?.showTier1Suffix) return `${base}·一级`;
  return base;
}
