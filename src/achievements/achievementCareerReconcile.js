import { getHighestDifficultyBeaten } from "../game/runDifficultyProgress.js";
import { shouldSuppressAchievementsAndLeaderboardsInDevMode } from "../dev/developerMode.js";
import { evaluateAndUnlockAchievements } from "./achievementEvaluate.js";

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 */
function peakScoreFromCareer(career) {
  let peak = Math.max(0, Math.floor(Number(career?.bestWordScore) || 0));
  for (const row of career?.scoreLeaderboard ?? []) {
    peak = Math.max(peak, Math.max(0, Math.floor(Number(row?.score) || 0)));
  }
  return peak;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 */
function peakWordLengthFromCareer(career) {
  let peak = 0;
  for (const row of career?.lengthLeaderboard ?? []) {
    peak = Math.max(peak, Math.max(0, Math.floor(Number(row?.length) || 0)));
  }
  return peak;
}

/**
 * 从已持久化的生涯字段推断可补回的成就上下文（用于历史漏记修复）。
 * 仅包含「生涯里留有痕迹、可安全推断」的条件；不含整局一次性/瞬时条件。
 *
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @returns {import('./achievementEvaluate.js').AchievementEvalContext[]}
 */
export function buildCareerReconcileEvalContexts(career) {
  /** @type {import('./achievementEvaluate.js').AchievementEvalContext[]} */
  const contexts = [{}];

  const runsWon = Math.max(0, Math.floor(Number(career?.runsWon) || 0));
  if (runsWon > 0) {
    contexts.push({ runWon: true });
    const beaten = getHighestDifficultyBeaten(career);
    if (beaten >= 3) contexts.push({ runWon: true, runDifficultyIndex: 3 });
    if (beaten >= 6) contexts.push({ runWon: true, runDifficultyIndex: 6 });
    if (beaten >= 8) contexts.push({ runWon: true, runDifficultyIndex: 8 });
  }

  const peakScore = peakScoreFromCareer(career);
  if (peakScore > 0) contexts.push({ submit: { score: peakScore } });

  const peakLen = peakWordLengthFromCareer(career);
  if (peakLen > 0) contexts.push({ submit: { wordLength: peakLen } });

  return contexts;
}

/**
 * 按生涯持久化数据补判漏记成就（静默，不依赖当前局内状态）。
 *
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @returns {import('./achievementTypes.js').AchievementDefinition[]}
 */
export function reconcileAchievementsFromPersistedCareer(career) {
  if (shouldSuppressAchievementsAndLeaderboardsInDevMode()) return [];
  const seen = new Set();
  /** @type {import('./achievementTypes.js').AchievementDefinition[]} */
  const newly = [];

  for (const ctx of buildCareerReconcileEvalContexts(career)) {
    for (const def of evaluateAndUnlockAchievements(career, ctx)) {
      if (seen.has(def.id)) continue;
      seen.add(def.id);
      newly.push(def);
    }
  }

  return newly;
}
