import { RUN_START_LEVEL_INDEX } from "../levelDefinitions.js";
import { hasMeaningfulRunProgress } from "./runSaveMeaningfulProgress.js";

/**
 * @param {unknown} value
 * @returns {number}
 */
function nonNegInt(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

/**
 * @param {unknown} value
 * @returns {unknown[]}
 */
function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * 生涯统计是否表明玩家已实际游玩过（越过「未开始的首词教程」空壳）。
 * 用于兼容 bug 存续期间：教程 UI 未触发、flag 仍为 false，但仍产生了真实进度的存档。
 * 有意不用 normalizeSlotCareerStats，避免把收藏/宝藏注册表拖进启动路径。
 * @param {import('./runSaveSchema.js').SlotCareerStats | Record<string, unknown> | null | undefined} career
 */
export function careerShowsPastFirstWordTutorial(career) {
  if (!career || typeof career !== "object") return false;
  const c = /** @type {Record<string, unknown>} */ (career);
  if (nonNegInt(c.runsCompleted) > 0 || nonNegInt(c.runsWon) > 0) return true;
  if (nonNegInt(c.totalWordsSubmitted) > 0 || nonNegInt(c.totalLettersUsed) > 0) return true;
  if (
    nonNegInt(c.totalLettersDiscarded) > 0 ||
    nonNegInt(c.totalShopPurchases) > 0 ||
    nonNegInt(c.totalRerolls) > 0
  ) {
    return true;
  }
  const maxLevel = Math.floor(Number(c.maxLevelIndexReached));
  if (Number.isFinite(maxLevel) && maxLevel > RUN_START_LEVEL_INDEX) return true;
  const highestDiff = Math.floor(Number(c.highestDifficultyBeaten));
  if (Number.isFinite(highestDiff) && highestDiff >= 0) return true;
  if (asArray(c.presetsWonWith).length > 0) return true;
  if (asArray(c.discoveredTreasureIds).length > 0) return true;
  if (asArray(c.discoveredSpellIds).length > 0) return true;
  if (asArray(c.discoveredUpgradeIds).length > 0) return true;
  if (asArray(c.discoveredMaterialIds).length > 0) return true;
  if (asArray(c.discoveredAccessoryIds).length > 0) return true;
  if (
    c.discoveredVoucherTiers &&
    typeof c.discoveredVoucherTiers === "object" &&
    Object.keys(/** @type {object} */ (c.discoveredVoucherTiers)).length > 0
  ) {
    return true;
  }
  if (asArray(c.unlockedAchievementIds).length > 0) return true;
  if (asArray(c.scoreLeaderboard).length > 0 || asArray(c.lengthLeaderboard).length > 0) {
    return true;
  }
  if (asArray(c.favoriteWords).length > 0) return true;
  return false;
}

/**
 * 槽位是否已有「应跳过 / 视为完成首词教程」的证据（生涯或局内实质进度）。
 * @param {number} slotIndex
 * @param {{
 *   getSlotCareer: (index: number) => import('./runSaveSchema.js').SlotCareerStats | null | undefined,
 *   getSlotPayload: (index: number) => import('./runSavePayload.js').RunSavePayload | null | undefined,
 * }} deps
 */
export function slotHasPastFirstWordTutorialEvidence(slotIndex, deps) {
  if (careerShowsPastFirstWordTutorial(deps.getSlotCareer(slotIndex))) return true;
  const payload = deps.getSlotPayload(slotIndex);
  return payload != null && hasMeaningfulRunProgress(payload);
}
