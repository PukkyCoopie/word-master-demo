/** 彗星：列出的概率翻倍 */
export const PROBABILITY_DOUBLER_TREASURE_ID = "45";

/**
 * @param {readonly (string | null | undefined)[]} ownedSlotTreasureIds
 */
export function hasProbabilityDoubler(ownedSlotTreasureIds) {
  if (!Array.isArray(ownedSlotTreasureIds)) return false;
  return ownedSlotTreasureIds.some((id) => String(id ?? "") === PROBABILITY_DOUBLER_TREASURE_ID);
}

/**
 * @param {number} numerator
 * @param {number} denominator
 * @param {readonly (string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function effectiveProbability(numerator, denominator, ownedSlotTreasureIds) {
  const d = Math.max(1, Math.floor(Number(denominator) || 1));
  const n = Math.max(0, Math.floor(Number(numerator) || 0));
  let p = n / d;
  if (hasProbabilityDoubler(ownedSlotTreasureIds)) p = Math.min(1, p * 2);
  return p;
}

/**
 * @param {number} numerator
 * @param {number} denominator
 * @param {() => number} rng
 * @param {readonly (string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function rollProbabilitySuccess(numerator, denominator, rng, ownedSlotTreasureIds) {
  const roll = typeof rng === "function" ? rng() : Math.random();
  return roll < effectiveProbability(numerator, denominator, ownedSlotTreasureIds);
}

/**
 * 与 `rng() >= p` 跳过自毁的写法对称：双倍概率时更易触发。
 * @param {number} numerator
 * @param {number} denominator
 * @param {() => number} rng
 * @param {readonly (string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function rollProbabilityFailsSkip(numerator, denominator, rng, ownedSlotTreasureIds) {
  const roll = typeof rng === "function" ? rng() : Math.random();
  return roll >= effectiveProbability(numerator, denominator, ownedSlotTreasureIds);
}

/**
 * @param {number} numerator
 * @param {number} denominator
 * @param {boolean} [displayDoubled]
 */
export function formatProbabilityLabel(numerator, denominator, displayDoubled = false) {
  const d = Math.max(1, Math.floor(Number(denominator) || 1));
  let n = Math.max(0, Math.floor(Number(numerator) || 0));
  if (displayDoubled) {
    n = Math.min(d, n * 2);
  }
  return `${n}/${d}`;
}

/**
 * @param {string} fraction 如 "1/6"
 * @param {boolean} [displayDoubled]
 */
export function parseProbabilityFraction(fraction, displayDoubled = false) {
  const m = String(fraction ?? "").trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return formatProbabilityLabel(1, 6, displayDoubled);
  return formatProbabilityLabel(Number(m[1]), Number(m[2]), displayDoubled);
}
