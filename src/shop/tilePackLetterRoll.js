/**
 * 全局字母加权随机：按初始牌库张数线性映射权重，最高（E）与最低（史诗/传说）比为 2:1。
 * 用于字母包、单卡字母商品、法术变字母、宝藏进关赠字母等一切「掷出随机字母」场景。
 */
import { allLetterRaws, getInitialDeckLetterCount } from "../game/initialDeckLetterCounts.js";

/** 字母权重下界（对应牌库最少张数） */
export const TILE_PACK_LETTER_WEIGHT_MIN = 1;
/** 字母权重上界（对应牌库最多张数，如 E=9） */
export const TILE_PACK_LETTER_WEIGHT_MAX = 2;

const DECK_COUNT_MIN = 1;
const DECK_COUNT_MAX = Math.max(...allLetterRaws().map(getInitialDeckLetterCount));
const DECK_COUNT_SPAN = Math.max(1, DECK_COUNT_MAX - DECK_COUNT_MIN);

/**
 * @param {string} raw
 * @returns {number}
 */
export function getTilePackLetterWeight(raw) {
  const count = getInitialDeckLetterCount(raw);
  const t = (count - DECK_COUNT_MIN) / DECK_COUNT_SPAN;
  return TILE_PACK_LETTER_WEIGHT_MIN + t * (TILE_PACK_LETTER_WEIGHT_MAX - TILE_PACK_LETTER_WEIGHT_MIN);
}

/**
 * @param {number[]} weights
 * @param {() => number} rng
 * @returns {number}
 */
function pickWeightedIndex(weights, rng) {
  let total = 0;
  for (const w of weights) total += w;
  if (total <= 0) return Math.max(0, weights.length - 1);
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * 按权重有放回抽取 1 个字母。
 * @param {() => number} rng
 * @param {string[]} [pool]
 * @returns {string}
 */
export function pickWeightedLetterRaw(rng, pool = allLetterRaws()) {
  if (!pool.length) return "e";
  const weights = pool.map((raw) => getTilePackLetterWeight(raw));
  const idx = pickWeightedIndex(weights, rng);
  return pool[idx] ?? "e";
}

/**
 * 按权重无放回抽取若干不重复字母。
 * @param {() => number} rng
 * @param {number} n
 * @param {string[]} [pool]
 * @returns {string[]}
 */
export function pickDistinctWeightedLetterRaws(rng, n, pool = allLetterRaws()) {
  const remaining = [...pool];
  /** @type {string[]} */
  const picked = [];
  const count = Math.min(Math.max(0, Math.floor(Number(n) || 0)), remaining.length);

  for (let k = 0; k < count; k += 1) {
    const weights = remaining.map((raw) => getTilePackLetterWeight(raw));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) break;

    const idx = pickWeightedIndex(weights, rng);
    picked.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return picked;
}
