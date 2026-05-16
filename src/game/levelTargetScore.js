/**
 * Balatro 式通关分（https://balatrowiki.org/w/Blinds_and_Antes）：
 * - 章 = Ante；章底 = 该 Ante 的 base chip requirement（普通 Stake）
 * - 小关 1 / 2 / Boss：1×、1.5×、Boss 表中的「Score at least…」倍数
 * - 游戏内数值 = round(wikiBase × CHAPTER_BASE_SCALE × blindMult)，一次舍入
 */

import { BOSS_SCORE_BASE_MULT_DEFAULT, getBossScoreBaseMult } from "./bossBlindDefinitions.js";

/** Ante 1..8 的 base chip requirement（普通难度，List of Antes） */
export const WIKI_ANTE_BASE_CHIPS = Object.freeze([300, 800, 2000, 5000, 11000, 20000, 35000, 50000]);

/** Ante ≤0 的 base（Hieroglyph 等）；本游戏 8 章流程未使用 */
export const WIKI_ANTE0_BASE_CHIPS = 100;

/** 第 1 章小关 1 = wiki Ante1 base × scale；默认 scale 使 1-1 = 100 */
export const CHAPTER_BASE_SCALE = 100 / 300;

/** @see https://balatrowiki.org/w/Blinds_and_Antes — Small Blind */
export const BLIND_MULT_SMALL = 1;

/** @see https://balatrowiki.org/w/Blinds_and_Antes — Big Blind */
export const BLIND_MULT_BIG = 1.5;

/** 普通 Boss / Showdown 默认 2× base */
export const BLIND_MULT_BOSS_DEFAULT = BOSS_SCORE_BASE_MULT_DEFAULT;

/**
 * @param {number} chapter 1..8
 * @returns {number} 缩放后的章底 B（与 round(wikiBase × scale) 一致）
 */
export function getChapterBaseB(chapter) {
  const n = Math.max(1, Math.min(8, Math.floor(Number(chapter)) || 1));
  return scaleWikiBaseChips(WIKI_ANTE_BASE_CHIPS[n - 1]);
}

/**
 * @param {number} wikiBaseChips
 * @returns {number}
 */
export function scaleWikiBaseChips(wikiBaseChips) {
  return Math.round(Number(wikiBaseChips) * CHAPTER_BASE_SCALE);
}

/**
 * @param {string} levelId 如 "3-2"
 * @returns {{ chapter: number, sub: number }}
 */
export function parseLevelId(levelId) {
  const parts = String(levelId ?? "").split("-");
  const chapter = Math.max(1, Math.min(8, Math.floor(Number(parts[0])) || 1));
  const sub = Math.max(1, Math.min(3, Math.floor(Number(parts[1])) || 1));
  return { chapter, sub };
}

/**
 * @param {number} chapter 1..8
 * @param {number} blindMult 相对章底 wiki base 的倍数（1 / 1.5 / 2 / 4 / 6…）
 * @returns {number}
 */
export function computeTargetScoreForChapter(chapter, blindMult) {
  const n = Math.max(1, Math.min(8, Math.floor(Number(chapter)) || 1));
  const wikiBase = WIKI_ANTE_BASE_CHIPS[n - 1];
  const m = Number(blindMult);
  if (!Number.isFinite(m) || m <= 0) return scaleWikiBaseChips(wikiBase);
  return Math.round(wikiBase * CHAPTER_BASE_SCALE * m);
}

/**
 * @param {string} levelId
 * @param {number} [bossScoreBaseMult=2] Boss 关相对章底的倍数；非 Boss 小关忽略
 * @returns {number}
 */
export function computeTargetScoreForLevel(levelId, bossScoreBaseMult = BLIND_MULT_BOSS_DEFAULT) {
  const { chapter, sub } = parseLevelId(levelId);
  if (sub === 1) return computeTargetScoreForChapter(chapter, BLIND_MULT_SMALL);
  if (sub === 2) return computeTargetScoreForChapter(chapter, BLIND_MULT_BIG);
  const bm = Number(bossScoreBaseMult);
  const mult = Number.isFinite(bm) && bm > 0 ? bm : BLIND_MULT_BOSS_DEFAULT;
  return computeTargetScoreForChapter(chapter, mult);
}

/**
 * @param {string} levelId
 * @param {string} [bossSlugForSub3=""] x-3 关的 Boss slug；非第三小关忽略
 * @returns {number}
 */
export function resolveLevelTargetScore(levelId, bossSlugForSub3 = "") {
  const { sub } = parseLevelId(levelId);
  const mult = sub === 3 ? getBossScoreBaseMult(bossSlugForSub3) : BLIND_MULT_BOSS_DEFAULT;
  return computeTargetScoreForLevel(levelId, mult);
}

export { getBossScoreBaseMult, getBossScoreMult } from "./bossBlindDefinitions.js";
