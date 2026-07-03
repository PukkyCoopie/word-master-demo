/**
 * 宝藏 / Boss 用词性判定（与词典 `pos` 字段宽松匹配）。
 */

import { BOSS_CLUB_POS_OPTIONS, dictionaryPosMatchesClubKey } from "./bossClubPos.js";

/** 词性 $4 宝藏可随机到的目标（不含副词） */
export const TREASURE_LEVEL_POS_OPTIONS = BOSS_CLUB_POS_OPTIONS;

/** @typedef {typeof BOSS_CLUB_POS_OPTIONS[number]["key"]} TreasureLevelPosKey */

/** @param {string} key */
export function getTreasureLevelPosLabelZh(key) {
  const opt = TREASURE_LEVEL_POS_OPTIONS.find((o) => o.key === key);
  return opt?.labelZh ?? "词性";
}

/**
 * @param {() => number} [rng]
 * @param {TreasureLevelPosKey | string | null | undefined} [excludeKey] 若提供则不会 roll 到该词性
 * @returns {TreasureLevelPosKey}
 */
export function rollTreasureLevelPosKey(rng = Math.random, excludeKey = undefined) {
  const list =
    excludeKey != null && excludeKey !== ""
      ? TREASURE_LEVEL_POS_OPTIONS.filter((o) => o.key !== excludeKey)
      : TREASURE_LEVEL_POS_OPTIONS;
  const pool = list.length ? list : TREASURE_LEVEL_POS_OPTIONS;
  const i = Math.floor(rng() * pool.length);
  return /** @type {TreasureLevelPosKey} */ (pool[Math.max(0, Math.min(pool.length - 1, i))].key);
}

/**
 * @param {string | null | undefined} dictPos
 * @param {string} requiredKey `n` | `v` | `adj`
 * @param {string | null | undefined} [translationZh]
 */
export function dictionaryPosMatchesTreasureLevelKey(dictPos, requiredKey, translationZh) {
  return dictionaryPosMatchesClubKey(dictPos, requiredKey, translationZh);
}

/**
 * 词性是否**仅**为某一类（如仅有名词、无动词/形容词等并列标注）。
 * @param {string | null | undefined} dictPos
 * @param {string} requiredKey `n` | `v` | `adj`
 */
export function dictionaryPosIsExclusivelyTreasureLevelKey(dictPos, requiredKey) {
  const raw = String(dictPos ?? "").trim();
  if (!raw) return false;
  const requiredOpt = BOSS_CLUB_POS_OPTIONS.find((o) => o.key === requiredKey);
  if (!requiredOpt) return false;
  const tokens = raw
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
  const toCheck = tokens.length ? tokens : [raw];
  const matchesRequired = toCheck.some((token) => requiredOpt.patterns.some((re) => re.test(token)));
  if (!matchesRequired) return false;
  for (const token of toCheck) {
    for (const opt of BOSS_CLUB_POS_OPTIONS) {
      if (opt.key === requiredKey) continue;
      if (opt.patterns.some((re) => re.test(token))) return false;
    }
  }
  return true;
}

/** @param {string | null | undefined} dictPos */
export function dictionaryPosMatchesAdverb(dictPos) {
  const raw = String(dictPos ?? "").trim();
  if (!raw) return false;
  return [/副|adverb|^adv\.?$/i, /^adv$/i].some((re) => re.test(raw));
}

/** @param {string} word @param {string} suffix */
export function wordEndsWithSuffix(word, suffix) {
  const w = String(word ?? "").toLowerCase().trim();
  const s = String(suffix ?? "").toLowerCase();
  return s.length > 0 && w.endsWith(s);
}
