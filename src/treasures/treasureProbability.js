import { countTreasureHookContributionPaths } from "../game/treasureBlueprintMirror.js";

/** 彗星：列出的概率翻倍（多个彗星叠乘，上限 100%） */
export const PROBABILITY_DOUBLER_TREASURE_ID = "45";

/**
 * 彗星（45）有效路径数：实体槽 + 面具/绵羊 blueprint 镜像。
 * @param {readonly (string | null | undefined)[]} ownedSlotTreasureIds
 */
export function countProbabilityDoublerContributions(ownedSlotTreasureIds) {
  return countTreasureHookContributionPaths(
    ownedSlotTreasureIds ?? [],
    PROBABILITY_DOUBLER_TREASURE_ID,
  );
}

/**
 * @param {readonly (string | null | undefined)[]} ownedSlotTreasureIds
 */
export function hasProbabilityDoubler(ownedSlotTreasureIds) {
  return countProbabilityDoublerContributions(ownedSlotTreasureIds) > 0;
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
  const doublerCount = countProbabilityDoublerContributions(ownedSlotTreasureIds);
  if (doublerCount > 0) p = Math.min(1, p * 2 ** doublerCount);
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
 * @param {number} [doublerCount=0] 彗星叠乘次数（每枚 ×2，分子封顶分母）
 */
export function formatProbabilityLabel(numerator, denominator, doublerCount = 0) {
  const d = Math.max(1, Math.floor(Number(denominator) || 1));
  let n = Math.max(0, Math.floor(Number(numerator) || 0));
  const count = Math.max(0, Math.floor(Number(doublerCount) || 0));
  if (count > 0) n = Math.min(d, n * 2 ** count);
  return `${n}/${d}`;
}

/**
 * @param {string} fraction 如 "1/6"
 * @param {number} [doublerCount=0]
 */
export function parseProbabilityFraction(fraction, doublerCount = 0) {
  const m = String(fraction ?? "").trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!m) return formatProbabilityLabel(1, 6, doublerCount);
  return formatProbabilityLabel(Number(m[1]), Number(m[2]), doublerCount);
}
