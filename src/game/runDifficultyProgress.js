import {
  DEFAULT_RUN_DIFFICULTY_INDEX,
  normalizeRunDifficultyIndex,
  RUN_DIFFICULTY_COUNT,
  RUN_DIFFICULTY_DEFINITIONS,
} from "./runDifficultyDefinitions.js";
import { normalizeRunPresetId } from "./runPresetDefinitions.js";

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function getHighestDifficultyBeaten(career) {
  const n = Math.floor(Number(career?.highestDifficultyBeaten));
  if (!Number.isFinite(n)) return -1;
  return Math.max(-1, Math.min(RUN_DIFFICULTY_COUNT - 1, n));
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 * @param {number} index
 */
export function isDifficultyUnlocked(index, career) {
  const ix = normalizeRunDifficultyIndex(index);
  if (ix <= 1) return true;
  return getHighestDifficultyBeaten(career) >= ix - 1;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function getUnlockedDifficultyCount(career) {
  const beaten = getHighestDifficultyBeaten(career);
  return Math.min(RUN_DIFFICULTY_COUNT, Math.max(2, beaten + 2));
}

/**
 * @param {number} index
 * @returns {string}
 */
export function getDifficultyIdAtBrowseIndex(index) {
  const ix = Math.max(0, Math.min(RUN_DIFFICULTY_COUNT - 1, Math.floor(Number(index) || 0)));
  return String(ix);
}

/**
 * @param {string | number | null | undefined} idOrIndex
 * @returns {number}
 */
export function getDifficultyIndexById(idOrIndex) {
  return normalizeRunDifficultyIndex(idOrIndex);
}

/**
 * @param {number} currentIndex
 * @param {number} delta
 * @returns {number}
 */
export function stepDifficultyBrowseIndex(currentIndex, delta) {
  const n = RUN_DIFFICULTY_COUNT;
  const idx = Math.max(0, Math.min(n - 1, Math.floor(Number(currentIndex) || 0)));
  return (idx + delta + n) % n;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 * @param {string} presetId
 * @returns {number} -1 表示该预设尚无通关记录
 */
export function getPresetHighestDifficultyWon(career, presetId) {
  const pid = normalizeRunPresetId(presetId);
  const map = career?.presetHighestDifficultyWon;
  if (!map || typeof map !== "object") return -1;
  const n = Math.floor(Number(/** @type {Record<string, unknown>} */ (map)[pid]));
  if (!Number.isFinite(n)) return -1;
  return Math.max(-1, Math.min(RUN_DIFFICULTY_COUNT - 1, n));
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} difficultyIndex
 * @param {string} presetId
 */
export function recordDifficultyWin(career, difficultyIndex, presetId) {
  const ix = normalizeRunDifficultyIndex(difficultyIndex);
  const pid = normalizeRunPresetId(presetId);
  if (ix > 0) {
    const beaten = getHighestDifficultyBeaten(career);
    if (ix > beaten) career.highestDifficultyBeaten = ix;
  }
  if (!career.presetHighestDifficultyWon || typeof career.presetHighestDifficultyWon !== "object") {
    career.presetHighestDifficultyWon = {};
  }
  const prev = getPresetHighestDifficultyWon(career, pid);
  if (ix > prev) career.presetHighestDifficultyWon[pid] = ix;
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career */
export function getLastSelectedDifficultyIndex(career) {
  const ix = normalizeRunDifficultyIndex(career?.lastSelectedDifficultyIndex);
  if (isDifficultyUnlocked(ix, career)) return ix;
  return DEFAULT_RUN_DIFFICULTY_INDEX;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {number} index
 */
export function setLastSelectedDifficultyIndex(career, index) {
  const ix = normalizeRunDifficultyIndex(index);
  career.lastSelectedDifficultyIndex = isDifficultyUnlocked(ix, career)
    ? ix
    : DEFAULT_RUN_DIFFICULTY_INDEX;
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career */
export function getLastSelectedDifficultyBrowseIndex(career) {
  return getLastSelectedDifficultyIndex(career);
}

export { RUN_DIFFICULTY_DEFINITIONS };
