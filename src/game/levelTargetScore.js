/**
 * Balatro 式通关分（https://balatrowiki.org/w/Blinds_and_Antes）：
 * - 第 N 大关 = Ante N；章底 = List of Antes 的 Base Chip Requirement（普通 Stake）
 * - 小关 1 / 2 / Boss：1×、1.5×、Boss 表「Score at least…」倍数（默认 2×）
 * - 通关分 = round(章底 × blindMult)
 */

import { BOSS_SCORE_BASE_MULT_DEFAULT, getBossScoreBaseMult } from "./bossBlindDefinitions.js";
import { getEndlessChapterBaseB } from "./endlessAnteScore.js";

/** Ante 1..8 的 base chip requirement（List of Antes，普通难度） */
export const WIKI_ANTE_BASE_CHIPS = Object.freeze([300, 800, 2000, 5000, 11000, 20000, 35000, 50000]);

/** Green Stake（Balatro Wiki） */
export const WIKI_GREEN_ANTE_BASE_CHIPS = Object.freeze([300, 900, 2600, 8000, 20000, 36000, 60000, 100000]);

/** Purple Stake（Balatro Wiki） */
export const WIKI_PURPLE_ANTE_BASE_CHIPS = Object.freeze([300, 1000, 3200, 9000, 25000, 60000, 110000, 200000]);

/** @typedef {'normal' | 'green' | 'purple'} ScoreTableTier */

/** Ante 0（卷轴券回退大关）章底，见 Balatro Wiki */
export const WIKI_ANTE0_BASE_CHIPS = 100;

/** @see https://balatrowiki.org/w/Blinds_and_Antes — Small Blind */
export const BLIND_MULT_SMALL = 1;

/** @see https://balatrowiki.org/w/Blinds_and_Antes — Big Blind */
export const BLIND_MULT_BIG = 1.5;

/** 普通 Boss / Showdown 默认 2× base */
export const BLIND_MULT_BOSS_DEFAULT = BOSS_SCORE_BASE_MULT_DEFAULT;

/**
 * @param {number} chapter 1..8（= Ante level）
 * @param {ScoreTableTier} [scoreTableTier='normal']
 * @returns {number} 该 Ante 的 base chip requirement
 */
export function getChapterBaseB(chapter, scoreTableTier = "normal") {
  const n = Math.floor(Number(chapter)) || 0;
  if (n <= 0) return WIKI_ANTE0_BASE_CHIPS;
  if (n <= 8) {
    const tier = scoreTableTier === "purple" ? WIKI_PURPLE_ANTE_BASE_CHIPS : scoreTableTier === "green" ? WIKI_GREEN_ANTE_BASE_CHIPS : WIKI_ANTE_BASE_CHIPS;
    return tier[n - 1];
  }
  const normalEndless = getEndlessChapterBaseB(n);
  if (scoreTableTier === "normal") return normalEndless;
  const normalAnte8 = WIKI_ANTE_BASE_CHIPS[7];
  const tierAnte8 =
    scoreTableTier === "purple" ? WIKI_PURPLE_ANTE_BASE_CHIPS[7] : WIKI_GREEN_ANTE_BASE_CHIPS[7];
  const ratio = tierAnte8 / normalAnte8;
  return Math.round(normalEndless * ratio);
}

/**
 * @param {string} levelId 如 "3-2"
 * @returns {{ chapter: number, sub: number }}
 */
export function parseLevelId(levelId) {
  const parts = String(levelId ?? "").split("-");
  const chapter = Math.max(0, Math.floor(Number(parts[0])) || 0);
  const sub = Math.max(1, Math.min(3, Math.floor(Number(parts[1])) || 1));
  return { chapter, sub };
}

/**
 * @param {number} chapter 1..8
 * @param {number} blindMult 相对章底的倍数（1 / 1.5 / 2 / 4 / 6…）
 * @param {ScoreTableTier} [scoreTableTier='normal']
 * @returns {number}
 */
export function computeTargetScoreForChapter(chapter, blindMult, scoreTableTier = "normal") {
  const base = getChapterBaseB(chapter, scoreTableTier);
  const m = Number(blindMult);
  if (!Number.isFinite(m) || m <= 0) return base;
  return Math.round(base * m);
}

/**
 * @param {string} levelId
 * @param {number} [bossScoreBaseMult=2] Boss 关倍数；非 Boss 小关忽略
 * @param {ScoreTableTier} [scoreTableTier='normal']
 * @returns {number}
 */
export function computeTargetScoreForLevel(levelId, bossScoreBaseMult = BLIND_MULT_BOSS_DEFAULT, scoreTableTier = "normal") {
  const { chapter, sub } = parseLevelId(levelId);
  if (sub === 1) return computeTargetScoreForChapter(chapter, BLIND_MULT_SMALL, scoreTableTier);
  if (sub === 2) return computeTargetScoreForChapter(chapter, BLIND_MULT_BIG, scoreTableTier);
  const bm = Number(bossScoreBaseMult);
  const mult = Number.isFinite(bm) && bm > 0 ? bm : BLIND_MULT_BOSS_DEFAULT;
  return computeTargetScoreForChapter(chapter, mult, scoreTableTier);
}

/**
 * 临时覆盖过关分（如 `{ "1-1": 3000 }`）；删键或置 0 即恢复 Balatro 公式。
 * @type {Readonly<Record<string, number>>}
 */
export const TEMP_OVERRIDE_TARGET_BY_LEVEL_ID = Object.freeze({});

/**
 * @param {string} levelId
 * @param {string} [bossSlugForSub3=""] x-3 关的 Boss slug；非第三小关忽略
 * @param {ScoreTableTier} [scoreTableTier='normal']
 * @returns {number}
 */
export function resolveLevelTargetScore(levelId, bossSlugForSub3 = "", scoreTableTier = "normal") {
  const id = String(levelId ?? "");
  const forced = TEMP_OVERRIDE_TARGET_BY_LEVEL_ID[id];
  if (forced != null && Number.isFinite(Number(forced)) && Number(forced) > 0) {
    return Math.floor(Number(forced));
  }
  const { sub } = parseLevelId(levelId);
  const mult = sub === 3 ? getBossScoreBaseMult(bossSlugForSub3) : BLIND_MULT_BOSS_DEFAULT;
  return computeTargetScoreForLevel(levelId, mult, scoreTableTier);
}

export { getBossScoreBaseMult, getBossScoreMult } from "./bossBlindDefinitions.js";
