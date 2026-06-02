import { LEVELS } from "../levelDefinitions.js";

/** @param {unknown} raw @returns {string[]} */
function normalizeIdList(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const id = String(item ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {Record<string, unknown>} raw
 */
export function normalizeAchievementCareerFields(career, raw) {
  career.unlockedAchievementIds = normalizeIdList(raw.unlockedAchievementIds);
  career.totalWordsSubmitted = Math.max(0, Math.floor(Number(raw.totalWordsSubmitted) || 0));
  career.peakWalletAmount = Math.max(0, Math.floor(Number(raw.peakWalletAmount) || 0));
  const maxIdx = Math.floor(Number(raw.maxLevelIndexReached) || -1);
  career.maxLevelIndexReached = maxIdx >= 0 && maxIdx < LEVELS.length ? maxIdx : -1;
}

/**
 * @param {string} levelId
 * @returns {number}
 */
export function getLevelIndexForId(levelId) {
  const id = String(levelId ?? "").trim();
  const ix = LEVELS.findIndex((l) => l.id === id);
  return ix >= 0 ? ix : -1;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} levelId
 */
export function recordCareerLevelReached(career, levelId) {
  const ix = getLevelIndexForId(levelId);
  if (ix < 0) return;
  if (!Number.isFinite(career.maxLevelIndexReached) || career.maxLevelIndexReached < ix) {
    career.maxLevelIndexReached = ix;
  }
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} wallet
 */
export function recordCareerWalletPeak(career, wallet) {
  const w = Math.max(0, Math.floor(Number(wallet) || 0));
  if (w > (career.peakWalletAmount ?? 0)) career.peakWalletAmount = w;
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats} career */
export function recordCareerWordSubmitted(career) {
  career.totalWordsSubmitted = Math.max(0, Math.floor(Number(career.totalWordsSubmitted) || 0)) + 1;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} achievementId
 * @returns {boolean}
 */
export function isAchievementUnlocked(career, achievementId) {
  const id = String(achievementId ?? "").trim();
  if (!id) return false;
  return (career.unlockedAchievementIds ?? []).includes(id);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} achievementId
 * @returns {boolean} newly unlocked
 */
export function unlockAchievementId(career, achievementId) {
  const id = String(achievementId ?? "").trim();
  if (!id) return false;
  if (!Array.isArray(career.unlockedAchievementIds)) career.unlockedAchievementIds = [];
  if (career.unlockedAchievementIds.includes(id)) return false;
  career.unlockedAchievementIds.push(id);
  return true;
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats} career */
export function countUnlockedAchievements(career) {
  return normalizeIdList(career.unlockedAchievementIds).length;
}

/**
 * 将局内上下文同步进 career，供成就条件判定（关卡进度、钱包峰值等）。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {import('./achievementEvaluate.js').AchievementEvalContext} ctx
 */
export function syncAchievementCareerFromContext(career, ctx) {
  if (ctx.currentLevelId) recordCareerLevelReached(career, ctx.currentLevelId);
  if (ctx.wallet != null) recordCareerWalletPeak(career, ctx.wallet);
}
