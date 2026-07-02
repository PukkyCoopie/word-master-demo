import { getWordDefinition, isAbbrevOnlyWord, wordHasNormalPos } from "../composables/useDictionary.js";
import {
  HINT_LEXICAL_TIER,
  hintLexicalPickWeightFromTier,
  hintWordIsFallbackOnlyFromDefinition,
} from "../dictionary/dictionaryLexical.js";

export { HINT_LEXICAL_TIER };

/**
 * @param {string} word
 * @returns {number}
 */
export function hintLexicalTierForWord(word) {
  const w = String(word).toLowerCase().trim();
  if (!w) return HINT_LEXICAL_TIER.NO_POS;
  if (isAbbrevOnlyWord(w)) return HINT_LEXICAL_TIER.ABBR_ONLY;
  if (wordHasNormalPos(w)) return HINT_LEXICAL_TIER.NORMAL_POS;
  return HINT_LEXICAL_TIER.NO_POS;
}

/**
 * @param {string} word
 * @returns {number}
 */
export function hintLexicalPickWeightForWord(word) {
  return hintLexicalPickWeightFromTier(hintLexicalTierForWord(word));
}

/**
 * 无正常词性释义、或全部释义均带 [] / 无词性 → 仅作提示兜底。
 * @param {string} word
 * @returns {boolean}
 */
export function hintWordIsFallbackOnlyForWord(word) {
  const w = String(word).toLowerCase().trim();
  if (!w) return true;
  const def = getWordDefinition(w);
  return hintWordIsFallbackOnlyFromDefinition(def, wordHasNormalPos(w));
}

/** @deprecated 使用 {@link hintWordIsFallbackOnlyForWord} */
export function hintTranslationLooksSpecializedForWord(word) {
  return hintWordIsFallbackOnlyForWord(word);
}
