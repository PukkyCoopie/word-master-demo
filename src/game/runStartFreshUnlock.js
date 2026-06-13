import { normalizeRunDifficultyIndex, RUN_DIFFICULTY_COUNT } from "./runDifficultyDefinitions.js";
import { getHighestDifficultyBeaten, isDifficultyUnlocked } from "./runDifficultyProgress.js";
import {
  getPresetIdAtBrowseIndex,
  getPresetIndexById,
  getUnlockedPresetCount,
  isPresetUnlocked,
} from "./runPresetProgress.js";
import { normalizeRunPresetId } from "./runPresetDefinitions.js";

/**
 * 通关后相对 career 快照，收集本次新解锁的预设 / 难度（供开局弹窗「新！」角标）。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} careerBefore
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} careerAfter
 * @param {boolean} presetWinRecorded `recordPresetWin` 是否新记录
 */
export function collectFreshUnlocksFromWin(careerBefore, careerAfter, presetWinRecorded) {
  /** @type {string[]} */
  const presetIds = [];
  /** @type {number[]} */
  const difficultyIndices = [];

  if (presetWinRecorded) {
    const countBefore = getUnlockedPresetCount(careerBefore);
    const countAfter = getUnlockedPresetCount(careerAfter);
    if (countAfter > countBefore) {
      presetIds.push(getPresetIdAtBrowseIndex(countAfter - 1));
    }
  }

  const beforeBeat = getHighestDifficultyBeaten(careerBefore);
  const afterBeat = getHighestDifficultyBeaten(careerAfter);
  if (afterBeat > beforeBeat) {
    const newIx = afterBeat + 1;
    if (newIx < RUN_DIFFICULTY_COUNT) difficultyIndices.push(newIx);
  }

  return { presetIds, difficultyIndices };
}

/**
 * 开局弹窗默认预设：有会话内 fresh 解锁时切到 browse 序最大且已解锁的一项。
 * @param {string} lastSelectedPresetId
 * @param {readonly (string | number)[] | null | undefined} freshUnlockPresetIds
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function resolveRunStartPresetDraft(lastSelectedPresetId, freshUnlockPresetIds, career) {
  const fallback = normalizeRunPresetId(lastSelectedPresetId);
  const fresh = (freshUnlockPresetIds ?? [])
    .map((id) => normalizeRunPresetId(String(id)))
    .filter((id) => isPresetUnlocked(id, career));
  if (fresh.length === 0) return fallback;
  fresh.sort((a, b) => getPresetIndexById(b) - getPresetIndexById(a));
  return fresh[0];
}

/**
 * 开局弹窗默认难度：有会话内 fresh 解锁时切到 index 最大且已解锁的一项。
 * @param {number} lastSelectedDifficultyIndex
 * @param {readonly (string | number)[] | null | undefined} freshUnlockDifficultyIndices
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function resolveRunStartDifficultyDraft(
  lastSelectedDifficultyIndex,
  freshUnlockDifficultyIndices,
  career,
) {
  const fallback = normalizeRunDifficultyIndex(lastSelectedDifficultyIndex);
  const fresh = (freshUnlockDifficultyIndices ?? [])
    .map((ix) => normalizeRunDifficultyIndex(ix))
    .filter((ix) => isDifficultyUnlocked(ix, career));
  if (fresh.length === 0) return fallback;
  return Math.max(...fresh);
}
