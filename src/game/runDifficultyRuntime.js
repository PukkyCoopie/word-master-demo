import {
  ACCESSORY_HOURGLASS,
  ACCESSORY_NO_SELL,
  ACCESSORY_RENTAL,
} from "../accessories/accessoryCatalog.js";
import { resolveLevelTargetScore } from "./levelTargetScore.js";
import { normalizeRunDifficultyIndex } from "./runDifficultyDefinitions.js";

/** @typedef {'normal' | 'green' | 'purple'} DifficultyScoreTableTier */

/** 难度负面配饰独立掷骰概率 */
export const DIFFICULTY_NEGATIVE_ACCESSORY_CHANCE = 0.3;

/**
 * @param {number | null | undefined} index
 * @returns {number}
 */
export function getDifficultyStartMoneyBonus(index) {
  return normalizeRunDifficultyIndex(index) === 0 ? 5 : 0;
}

/**
 * @param {number | null | undefined} index
 * @returns {number}
 */
export function getDifficultyTargetScoreMultiplier(index) {
  return normalizeRunDifficultyIndex(index) === 0 ? 0.75 : 1;
}

/**
 * @param {string} levelId
 * @param {string} [bossSlugForSub3=""]
 * @param {number | null | undefined} difficultyIndex
 * @returns {number}
 */
export function resolveLevelTargetScoreForDifficulty(
  levelId,
  bossSlugForSub3 = "",
  difficultyIndex = 0,
) {
  const ix = normalizeRunDifficultyIndex(difficultyIndex);
  const scoreTier = getDifficultyScoreTableTier(ix);
  const base = resolveLevelTargetScore(levelId, bossSlugForSub3, scoreTier);
  return Math.round(base * getDifficultyTargetScoreMultiplier(ix));
}

/**
 * @param {number | null | undefined} index
 * @returns {number}
 */
export function getDifficultyStageRewardDelta(index) {
  return normalizeRunDifficultyIndex(index) >= 2 ? -1 : 0;
}

/**
 * @param {number | null | undefined} index
 * @returns {number}
 */
export function getDifficultyRemovalsDelta(index) {
  return normalizeRunDifficultyIndex(index) >= 5 ? -1 : 0;
}

/**
 * @param {number | null | undefined} index
 * @returns {DifficultyScoreTableTier}
 */
export function getDifficultyScoreTableTier(index) {
  const ix = normalizeRunDifficultyIndex(index);
  if (ix >= 6) return "purple";
  if (ix >= 3) return "green";
  return "normal";
}

/**
 * @param {number | null | undefined} index
 * @returns {readonly string[]}
 */
export function getActiveDifficultyNegativeAccessoryRolls(index) {
  const ix = normalizeRunDifficultyIndex(index);
  /** @type {string[]} */
  const ids = [];
  if (ix >= 4) ids.push(ACCESSORY_NO_SELL);
  if (ix >= 7) ids.push(ACCESSORY_HOURGLASS);
  if (ix >= 8) ids.push(ACCESSORY_RENTAL);
  return Object.freeze(ids);
}

/**
 * @param {() => number} rng
 * @param {number | null | undefined} difficultyIndex
 * @returns {string[]}
 */
export function rollDifficultyNegativeTreasureAccessoryIds(rng, difficultyIndex) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  const rolls = getActiveDifficultyNegativeAccessoryRolls(difficultyIndex);
  /** @type {string[]} */
  const out = [];
  for (const id of rolls) {
    if (rnd() < DIFFICULTY_NEGATIVE_ACCESSORY_CHANCE) out.push(id);
  }
  return out;
}

/**
 * @param {readonly string[]} accessoryIds
 * @returns {boolean}
 */
export function treasureOfferHasRentalAccessory(accessoryIds) {
  return accessoryIds.includes(ACCESSORY_RENTAL);
}

/**
 * @param {readonly string[]} accessoryIds
 * @returns {boolean}
 */
export function treasureHasNoSellAccessoryIds(accessoryIds) {
  return accessoryIds.includes(ACCESSORY_NO_SELL);
}

/**
 * @param {{ treasureAccessoryIds?: unknown, treasureAccessoryId?: unknown } | null | undefined} slot
 */
export function ownedTreasureHasNoSellAccessory(slot) {
  if (!slot) return false;
  const ids = Array.isArray(slot.treasureAccessoryIds)
    ? slot.treasureAccessoryIds.map(String)
    : slot.treasureAccessoryId
      ? [String(slot.treasureAccessoryId)]
      : [];
  return treasureHasNoSellAccessoryIds(ids);
}
