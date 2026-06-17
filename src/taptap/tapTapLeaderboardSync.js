import { Capacitor } from "@capacitor/core";
import { normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";
import { TapTap, ensureTapTapSdkInitialized } from "./tapTapPlugin.js";
import {
  TAPTAP_LB_AVG_WORD_LENGTH,
  TAPTAP_LB_BEST_SINGLE_WORD_SCORE,
  TAPTAP_LB_DIFFICULTY_ACHIEVED,
  TAPTAP_LB_DEFAULT_OPEN_ID,
  TAPTAP_LB_ENDLESS_CHAPTER,
  TAPTAP_WEB_LEADERBOARD_URL,
} from "./tapTapLeaderboardIds.js";

/**
 * @param {string} levelId
 * @returns {number}
 */
export function getChapterFromLevelId(levelId) {
  const ch = Number.parseInt(String(levelId ?? "").split("-")[0], 10);
  return Number.isFinite(ch) && ch > 0 ? ch : 0;
}

/**
 * @param {import("../game/runMatchStats.js").RunMatchStats} stats
 * @returns {number}
 */
export function computeRunAverageWordLetterLength(stats) {
  const words = Math.max(0, Math.floor(Number(stats?.wordsSubmitted) || 0));
  if (words <= 0) return 0;
  const letters = Math.max(0, Math.floor(Number(stats?.lettersUsed) || 0));
  return letters / words;
}

/**
 * 平均长度榜：保留两位小数，以整数上报（如 5.25 → 525）。
 * @param {number} avg
 * @returns {number}
 */
export function encodeAverageWordLengthScore(avg) {
  const n = Math.max(0, Number(avg) || 0);
  return Math.max(0, Math.round(n * 100));
}

/**
 * @param {readonly { leaderboardId: string, score: number }[]} scores
 */
async function submitLeaderboardScores(scores) {
  if (!Capacitor.isNativePlatform() || !scores?.length) return;
  const batch = scores
    .map((s) => ({
      leaderboardId: String(s.leaderboardId ?? "").trim(),
      score: Math.floor(Number(s.score) || 0),
    }))
    .filter((s) => s.leaderboardId && s.score >= 0);
  if (!batch.length) return;
  try {
    await ensureTapTapSdkInitialized();
    await TapTap.submitLeaderboardScores({ scores: batch });
  } catch {
    /* 未登录或网络异常时不阻断游戏 */
  }
}

/**
 * @param {string} [leaderboardId]
 * @param {string} [collection]
 */
export async function openTapTapLeaderboardUi(
  leaderboardId = TAPTAP_LB_ENDLESS_CHAPTER,
  collection = "public",
) {
  if (!Capacitor.isNativePlatform()) return;
  const id = String(leaderboardId ?? "").trim();
  if (!id) return;
  try {
    await ensureTapTapSdkInitialized();
    await TapTap.openLeaderboard({ leaderboardId: id, collection });
  } catch {
    /* ignore */
  }
}

/**
 * 主菜单排行榜入口：原生打开 SDK 面板；Web 新标签打开 TapTap 榜页并触发提示弹窗。
 * @param {{ onWebHint?: () => void }} [opts]
 */
export function openTapTapLeaderboardFromMenu(opts = {}) {
  if (!Capacitor.isNativePlatform()) {
    window.open(TAPTAP_WEB_LEADERBOARD_URL, "_blank", "noopener,noreferrer");
    opts.onWebHint?.();
    return;
  }
  void openTapTapLeaderboardUi(TAPTAP_LB_DEFAULT_OPEN_ID);
}

/**
 * @param {number} chapter
 */
export function reportEndlessChapterLeaderboard(chapter) {
  const ch = Math.max(0, Math.floor(Number(chapter) || 0));
  if (ch <= 0) return;
  void submitLeaderboardScores([{ leaderboardId: TAPTAP_LB_ENDLESS_CHAPTER, score: ch }]);
}

/**
 * @param {import("../game/runMatchStats.js").RunMatchStats} stats
 */
export function reportAverageWordLengthOnWin(stats) {
  const avg = computeRunAverageWordLetterLength(stats);
  if (avg <= 0) return;
  void submitLeaderboardScores([
    { leaderboardId: TAPTAP_LB_AVG_WORD_LENGTH, score: encodeAverageWordLengthScore(avg) },
  ]);
}

/**
 * @param {number} difficultyIndex
 */
export function reportDifficultyAchievedLeaderboard(difficultyIndex) {
  const ix = normalizeRunDifficultyIndex(difficultyIndex);
  if (ix <= 0) return;
  void submitLeaderboardScores([{ leaderboardId: TAPTAP_LB_DIFFICULTY_ACHIEVED, score: ix }]);
}

/**
 * @param {number} score
 * @param {number} previouslyReportedBest
 * @returns {boolean} 是否已触发上报
 */
export function reportBestSingleWordScoreIfImproved(score, previouslyReportedBest) {
  const sc = Math.max(0, Math.floor(Number(score) || 0));
  const prev = Math.max(0, Math.floor(Number(previouslyReportedBest) || 0));
  if (sc <= prev) return false;
  void submitLeaderboardScores([{ leaderboardId: TAPTAP_LB_BEST_SINGLE_WORD_SCORE, score: sc }]);
  return true;
}
