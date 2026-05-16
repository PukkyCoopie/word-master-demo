/**
 * Balatro 无尽模式 Ante 底分（普通 Stake，见 https://balatrowiki.org/w/Blinds_and_Antes ）
 * Ante 9–16 为 Collection 列表值；Ante 17+ 用 Wiki 公式自 Ante 8 底分推算。
 */

/** Ante 9 … 16 的 base chip requirement（普通难度） */
export const WIKI_ENDLESS_ANTE_BASE_CHIPS = Object.freeze([
  110_000,
  560_000,
  7_200_000,
  300_000_000,
  47_000_000_000,
  2.9e13,
  7.7e16,
  8.6e20,
]);

/** 与 `levelTargetScore.WIKI_ANTE_BASE_CHIPS[7]`（Ante 8）一致 */
const ANTE8_BASE = 50_000;

/**
 * @param {number} n
 * @returns {number}
 */
export function roundToTwoSignificantDigits(n) {
  const x = Number(n);
  if (!Number.isFinite(x) || x === 0) return 0;
  const exp = Math.floor(Math.log10(Math.abs(x)));
  const factor = 10 ** (exp - 1);
  return Math.round(x / factor) * factor;
}

/**
 * Wiki：Ante≥9 时 Chip = Ante8 × (1.6 + (0.75·(ante−8))^(1+0.2·(ante−8)))^(ante−8)，再取两位有效数字
 * @param {number} ante 9+
 * @returns {number}
 */
export function computeEndlessAnteBaseChipsFormula(ante) {
  const a = Math.max(9, Math.floor(Number(ante)) || 9);
  const d = a - 8;
  const inner = 1.6 + 0.75 * d ** (1 + 0.2 * d);
  return roundToTwoSignificantDigits(ANTE8_BASE * inner ** d);
}

/**
 * @param {number} chapter Ante / 大关序号（1…∞）
 * @returns {number}
 */
export function getEndlessChapterBaseB(chapter) {
  const ante = Math.max(9, Math.floor(Number(chapter)) || 9);
  if (ante <= 16) return WIKI_ENDLESS_ANTE_BASE_CHIPS[ante - 9];
  return computeEndlessAnteBaseChipsFormula(ante);
}
