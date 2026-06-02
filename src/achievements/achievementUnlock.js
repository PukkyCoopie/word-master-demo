import { syncAchievementCareerFromContext, unlockAchievementId } from "./achievementCareer.js";
import { evaluateAndUnlockAchievements } from "./achievementEvaluate.js";

export { unlockAchievementId };

/**
 * 在 career 上同步上下文并评估解锁；返回本批新解锁定义（不含已拥有）。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {import('./achievementEvaluate.js').AchievementEvalContext} ctx
 * @returns {import('./achievementTypes.js').AchievementDefinition[]}
 */
export function tryUnlockAchievementsInCareer(career, ctx) {
  syncAchievementCareerFromContext(career, ctx);
  return evaluateAndUnlockAchievements(career, ctx);
}
