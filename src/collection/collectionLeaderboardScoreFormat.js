import {
  formatIntegerScoreForDisplay,
  formatScoreScientificNotation,
  SCORE_DIRECT_SCIENTIFIC_DECIMALS,
} from "../utils/scoreNumericFormat.js";

/** 收藏单词榜得分：溢出时科学计数法 mantissa 小数位 */
export const COLLECTION_LEADERBOARD_SCORE_SCI_DECIMALS = SCORE_DIRECT_SCIENTIFIC_DECIMALS;

/**
 * @param {number} score
 */
export function formatCollectionLeaderboardScoreLocale(score) {
  return formatIntegerScoreForDisplay(Math.round(Number(score) || 0));
}

/**
 * @param {number} score
 */
export function formatCollectionLeaderboardScoreScientific(score) {
  return formatScoreScientificNotation(
    Math.round(Number(score) || 0),
    COLLECTION_LEADERBOARD_SCORE_SCI_DECIMALS,
  );
}
