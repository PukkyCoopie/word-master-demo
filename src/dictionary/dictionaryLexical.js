import { splitPosFieldTokens } from "./dictionaryIndexBuild.js";
import { inferPosFromTranslationHead } from "../game/bossClubPos.js";
import { parseTranslationLines } from "./parseTranslationLines.js";

/** 视为「正常词性」的 token；含 abbr 但同时含其一则仍视为常见词 */
export const NORMAL_POS_TOKENS = new Set([
  "n",
  "v",
  "vi",
  "vt",
  "adj",
  "adv",
  "prep",
  "conj",
  "pron",
  "num",
  "art",
  "interj",
  "aux",
  "det",
  "a",
]);

/** @enum {number} */
export const HINT_LEXICAL_TIER = Object.freeze({
  ABBR_ONLY: 1,
  NO_POS: 2,
  NORMAL_POS: 3,
});

/**
 * @param {Map<string, Set<string>> | null | undefined} posTagsMap
 * @param {string} word
 * @returns {boolean}
 */
export function isAbbrevOnlyWordInPosTags(posTagsMap, word) {
  const w = String(word).toLowerCase().trim();
  if (!w || !(posTagsMap instanceof Map)) return false;
  const tags = posTagsMap.get(w);
  if (!tags || !tags.has("abbr")) return false;
  for (const token of tags) {
    if (NORMAL_POS_TOKENS.has(token)) return false;
  }
  return true;
}

/**
 * @param {Map<string, Set<string>> | null | undefined} posTagsMap
 * @param {Map<string, { word: string, pos?: string, translation_zh?: string }> | null | undefined} wordInfoMap
 * @param {string} word
 * @returns {boolean}
 */
export function wordHasNormalPosInIndex(posTagsMap, wordInfoMap, word) {
  const w = String(word).toLowerCase().trim();
  if (!w) return false;
  if (posTagsMap instanceof Map) {
    const tags = posTagsMap.get(w);
    if (tags) {
      for (const token of tags) {
        if (NORMAL_POS_TOKENS.has(token)) return true;
      }
      return false;
    }
  }
  const entry = wordInfoMap?.get(w);
  if (entry?.pos) {
    for (const token of splitPosFieldTokens(entry.pos)) {
      if (NORMAL_POS_TOKENS.has(token)) return true;
    }
  }
  return false;
}

/**
 * @param {string} word
 * @param {Map<string, Set<string>> | null | undefined} posTagsMap
 * @param {Map<string, { word: string, pos?: string, translation_zh?: string }> | null | undefined} wordInfoMap
 * @returns {number}
 */
export function hintLexicalTierFromMaps(word, posTagsMap, wordInfoMap) {
  const w = String(word).toLowerCase().trim();
  if (!w) return HINT_LEXICAL_TIER.NO_POS;
  if (isAbbrevOnlyWordInPosTags(posTagsMap, w)) return HINT_LEXICAL_TIER.ABBR_ONLY;
  if (wordHasNormalPosInIndex(posTagsMap, wordInfoMap, w)) return HINT_LEXICAL_TIER.NORMAL_POS;
  return HINT_LEXICAL_TIER.NO_POS;
}

/**
 * 释义中含方括号，多为学科/专业标注（如「[化]学」）。
 * @param {string | null | undefined} translationZh
 * @returns {boolean}
 */
export function translationZhLooksSpecialized(translationZh) {
  const t = String(translationZh ?? "");
  return t.includes("[") || t.includes("]");
}

/** 括号/方括号内的人名或姓氏标注（中英文括号均匹配） */
const NAME_BRACKET_ANNOTATION_RE = /(?:[\[【]|[\(（])(?:姓名|姓)(?:[\]】]|[\)）])/;

/**
 * 释义行标注为人名或姓名（如「人名 爱因斯坦」「（姓名）」「[姓]」）。
 * @param {string | null | undefined} line
 * @returns {boolean}
 */
export function translationLineContainsPersonNameLabel(line) {
  const t = String(line ?? "");
  if (t.includes("人名")) return true;
  return NAME_BRACKET_ANNOTATION_RE.test(t);
}

/**
 * @param {string | null | undefined} token
 * @returns {boolean}
 */
export function hintPosTokenIsSpecific(token) {
  const t = String(token ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.$/, "");
  return Boolean(t) && NORMAL_POS_TOKENS.has(t);
}

/**
 * 单条释义是否带有具体词性（仅看该行首 n./vi./adj. 等，不用词条级 pos 字段）。
 * @param {string} line
 * @returns {boolean}
 */
export function hintTranslationLineHasSpecificPos(line) {
  return hintPosTokenIsSpecific(inferPosFromTranslationHead(line));
}

/**
 * 单条释义是否仅适合提示兜底：无具体词性、含方括号、或含人名/姓名标注。
 * @param {string} line
 * @returns {boolean}
 */
export function hintTranslationLineIsFallbackOnly(line) {
  if (translationZhLooksSpecialized(line)) return true;
  if (translationLineContainsPersonNameLabel(line)) return true;
  return !hintTranslationLineHasSpecificPos(line);
}

/**
 * 整词是否仅适合提示兜底：所有释义行均 fallback；无释义时看词条词性。
 * @param {{ pos?: string, translation_zh?: string } | null | undefined} def
 * @param {boolean} [wordHasNormalPos=false] 词性索引（posTags）是否含正常词性
 * @returns {boolean}
 */
export function hintWordIsFallbackOnlyFromDefinition(def, wordHasNormalPos = false) {
  const lines = parseTranslationLines(def?.translation_zh);
  if (!lines.length) {
    const hasWordLevelPos =
      wordHasNormalPos ||
      splitPosFieldTokens(def?.pos).some((token) => NORMAL_POS_TOKENS.has(token));
    return !hasWordLevelPos;
  }
  return lines.every((line) => hintTranslationLineIsFallbackOnly(line));
}

/**
 * @param {number} tier
 * @returns {number}
 */
export function hintLexicalPickWeightFromTier(tier) {
  if (tier === HINT_LEXICAL_TIER.NORMAL_POS) return 1;
  if (tier === HINT_LEXICAL_TIER.NO_POS) return 0.1;
  return 0.02;
}

/**
 * @param {Map<string, Set<string>> | null | undefined} posTagsMap
 * @returns {Set<string> | null}
 */
export function buildAbbrOnlyWordSetFromPosTags(posTagsMap) {
  if (!(posTagsMap instanceof Map)) return null;
  /** @type {Set<string>} */
  const only = new Set();
  for (const [w, tags] of posTagsMap) {
    if (!tags?.has("abbr")) continue;
    let hasNormal = false;
    for (const token of tags) {
      if (NORMAL_POS_TOKENS.has(token)) {
        hasNormal = true;
        break;
      }
    }
    if (!hasNormal) only.add(w);
  }
  return only;
}
