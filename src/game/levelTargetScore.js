/**
 * Balatro 式通关分：章底 B × 小关步长（1× / 1.5× / Boss 2×m）。
 * Wiki List of Antes 的 base chips，按 CHAPTER_BASE_SCALE 缩放到本游戏尺度。
 */

import { getBossScoreMult } from "./bossBlindDefinitions.js";

/** Balatro Ante 1..8 的 base chip requirement（普通难度） */
export const WIKI_ANTE_BASE_CHIPS = Object.freeze([300, 800, 2000, 5000, 11000, 20000, 35000, 50000]);

/** 第 1 章章底 B₁ = wiki[0] * scale；默认使 B₁=100 对齐旧 1-1 */
export const CHAPTER_BASE_SCALE = 100 / 300;

/**
 * @param {number} chapter 1..8
 * @returns {number}
 */
export function getChapterBaseB(chapter) {
  const n = Math.max(1, Math.min(8, Math.floor(Number(chapter)) || 1));
  return Math.round(WIKI_ANTE_BASE_CHIPS[n - 1] * CHAPTER_BASE_SCALE);
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
 * @param {string} levelId
 * @param {number} [bossScoreMult=1] Boss 关 m；非 Boss 小关忽略
 * @returns {number}
 */
export function computeTargetScoreForLevel(levelId, bossScoreMult = 1) {
  const { chapter, sub } = parseLevelId(levelId);
  const B = getChapterBaseB(chapter);
  if (sub === 1) return Math.round(B * 1.0);
  if (sub === 2) return Math.round(B * 1.5);
  const m = Math.max(0.25, Number(bossScoreMult) || 1);
  return Math.round(B * 2.0 * m);
}

/**
 * @param {string} levelId
 * @param {string} [bossSlugForSub3=""] x-3 关的 Boss slug；非第三小关忽略
 * @returns {number}
 */
export function resolveLevelTargetScore(levelId, bossSlugForSub3 = "") {
  const { sub } = parseLevelId(levelId);
  const m = sub === 3 ? getBossScoreMult(bossSlugForSub3) : 1;
  return computeTargetScoreForLevel(levelId, m);
}
