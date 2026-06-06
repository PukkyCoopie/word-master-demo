import { getCollectionTabProgress } from "../collection/collectionProgress.js";
import { isAchievementUnlocked } from "./achievementCareer.js";

/**
 * @typedef {{ current: number, target: number }} AchievementCollectionProgress
 */

/**
 * 收藏页：未解锁且生涯可累计的成就，返回当前/目标数值。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @param {import('./achievementTypes.js').AchievementDefinition} def
 * @returns {AchievementCollectionProgress | null}
 */
export function getAchievementCollectionProgress(career, def) {
  if (!def?.condition || isAchievementUnlocked(career, def.id)) return null;

  const c = def.condition;
  switch (c.kind) {
    case "career_words":
      return progressFromCareerCounter(career?.totalWordsSubmitted, c.threshold);
    case "career_tiles_used":
      return progressFromCareerCounter(career?.totalLettersUsed, c.threshold);
    case "career_tiles_discarded":
      return progressFromCareerCounter(career?.totalLettersDiscarded, c.threshold);
    case "career_wallet_peak":
    case "run_interest_total":
    case "run_money_spent":
      return null;
    case "discover_all_treasures":
      return progressFromCollectionTab(career, "treasures");
    case "discover_all_spells":
      return progressFromCollectionTab(career, "spells");
    case "discover_all_upgrades":
      return progressFromCollectionTab(career, "upgrades");
    case "discover_all_vouchers":
      return progressFromCollectionTab(career, "vouchers");
    case "discover_all_materials":
      return progressFromCollectionTab(career, "materials");
    case "discover_all_accessories":
      return progressFromCollectionTab(career, "accessories");
    default:
      return null;
  }
}

/** @param {unknown} raw @param {number | undefined} threshold */
function progressFromCareerCounter(raw, threshold) {
  const target = Math.max(0, Math.floor(Number(threshold) || 0));
  if (target <= 0) return null;
  const current = Math.max(0, Math.floor(Number(raw) || 0));
  return { current: Math.min(current, target), target };
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career @param {string} tabId */
function progressFromCollectionTab(career, tabId) {
  const p = getCollectionTabProgress(career, tabId);
  if (!p || p.total <= 0) return null;
  return {
    current: Math.min(Math.max(0, p.unlocked), p.total),
    target: p.total,
  };
}

/**
 * 描述后方进度文案，如 ` (350 / 800)`。
 * @param {AchievementCollectionProgress | null} progress
 * @returns {string | null}
 */
export function formatAchievementCollectionProgressSuffix(progress) {
  if (!progress || progress.target <= 0) return null;
  const { current, target } = progress;
  return ` (${current} / ${target})`;
}
