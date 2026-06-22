import { formatScoreScientificNotation } from "../utils/scoreNumericFormat.js";

/** 收藏单词榜得分：溢出时科学计数法 mantissa 小数位 */
export const COLLECTION_LEADERBOARD_SCORE_SCI_DECIMALS = 5;

/**
 * @param {number} score
 */
export function formatCollectionLeaderboardScoreLocale(score) {
  const rounded = Math.round(Number(score) || 0);
  if (!Number.isFinite(rounded)) return "0";
  return rounded.toLocaleString("zh-CN");
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
