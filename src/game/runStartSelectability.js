import { isDeveloperModeEnabled } from "../dev/developerMode.js";
import { isDifficultyUnlocked } from "./runDifficultyProgress.js";
import { isPresetUnlocked } from "./runPresetProgress.js";

/**
 * 开局弹窗是否可选该预设（开发者模式忽略解锁）。
 * @param {string} presetId
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function isRunStartPresetSelectable(presetId, career) {
  if (isDeveloperModeEnabled()) return true;
  return isPresetUnlocked(presetId, career);
}

/**
 * 开局弹窗是否可选该难度（开发者模式忽略解锁）。
 * @param {number} index
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function isRunStartDifficultySelectable(index, career) {
  if (isDeveloperModeEnabled()) return true;
  return isDifficultyUnlocked(index, career);
}
