import { RUN_DIFFICULTY_COUNT } from "./runDifficultyDefinitions.js";
import { getHighestDifficultyBeaten } from "./runDifficultyProgress.js";
import {
  getPresetIdAtBrowseIndex,
  getUnlockedPresetCount,
} from "./runPresetProgress.js";

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
