import { hasMeaningfulRunProgress } from "./runSaveMeaningfulProgress.js";
import { createEmptySlotCareerStats, SAVE_SLOT_COUNT } from "./runSaveSchema.js";
import {
  clearSlotRunProgress,
  getSlotCareer,
  getSlotPayload,
  hasAbandonedFreshRun,
  hasContinuableRun,
} from "./runSaveStorage.js";
import { normalizeSlotCareerStats } from "./slotCareerStats.js";
import {
  isFirstWordTutorialCompleted,
  markFirstWordTutorialCompleted,
} from "../profile/playerProfile.js";
import {
  careerShowsPastFirstWordTutorial,
  slotHasPastFirstWordTutorialEvidence as slotHasPastFirstWordTutorialEvidenceWithDeps,
} from "./firstWordTutorialProgressEvidence.js";

/** @param {number} slotIndex */
export function slotHasPastFirstWordTutorialEvidence(slotIndex) {
  return slotHasPastFirstWordTutorialEvidenceWithDeps(slotIndex, {
    getSlotCareer,
    getSlotPayload,
  });
}

/**
 * 启动 / 云档导入时：若槽位已有真实游玩证据但教程 flag 未置位，补标完成，避免再弹教程或误 discard。
 * @returns {number} 补标的槽位数
 */
export function backfillFirstWordTutorialCompletedFromPlayEvidence() {
  let marked = 0;
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    if (isFirstWordTutorialCompleted(i)) continue;
    if (!slotHasPastFirstWordTutorialEvidence(i)) continue;
    markFirstWordTutorialCompleted(i);
    marked += 1;
  }
  return marked;
}

/** @returns {boolean} 所有槽位均无已完成局、且无实质局内进度。 */
export function localSaveHasNoRunProgress() {
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const career = normalizeSlotCareerStats(getSlotCareer(i) ?? createEmptySlotCareerStats());
    if (career.runsCompleted > 0 || career.runsWon > 0) return false;
    const payload = getSlotPayload(i);
    if (payload && hasMeaningfulRunProgress(payload)) return false;
  }
  return true;
}

/**
 * 槽位是否仍应走「新局开教程」路径（含仅有空壳、无实质进度的情况）。
 * @param {number} slotIndex
 */
export function isSlotFreshForFirstWordTutorial(slotIndex) {
  if (isFirstWordTutorialCompleted(slotIndex)) return false;
  if (slotHasPastFirstWordTutorialEvidence(slotIndex)) return false;
  if (hasContinuableRun(slotIndex)) return false;
  const career = normalizeSlotCareerStats(
    getSlotCareer(slotIndex) ?? createEmptySlotCareerStats(),
  );
  if (career.runsCompleted > 0 || career.runsWon > 0) return false;
  const payload = getSlotPayload(slotIndex);
  if (payload && hasMeaningfulRunProgress(payload)) return false;
  return true;
}

/** @param {number} slotIndex */
export function shouldStartNewRunAtSlot(slotIndex) {
  return isSlotFreshForFirstWordTutorial(slotIndex);
}

/**
 * 首词教程未完成时丢弃局内存档，使下次「开始游戏」可重新开教程局。
 * 若已有真实游玩证据（含 bug 期未打教程但继续玩的局），则补标完成并保留进度。
 * @param {number} slotIndex
 * @returns {boolean} 是否清除了进度
 */
export function discardIncompleteFirstWordTutorialRunProgress(slotIndex) {
  if (isFirstWordTutorialCompleted(slotIndex)) return false;
  if (slotHasPastFirstWordTutorialEvidence(slotIndex)) {
    markFirstWordTutorialCompleted(slotIndex);
    return false;
  }
  if (!hasContinuableRun(slotIndex) && !hasAbandonedFreshRun(slotIndex)) return false;
  return clearSlotRunProgress(slotIndex);
}

export { careerShowsPastFirstWordTutorial };
