import { mutateSlotCareer, getSlotCareer, flushSaveStorageSync } from "../save/runSaveStorage.js";
import { createEmptySlotCareerStats, clampSaveSlotIndex } from "../save/runSaveSchema.js";
import { normalizeSlotCareerStats, hasSlotCompletedAnyRun } from "../save/slotCareerStats.js";
import { setWordHintMode, getWordHintMode, setWordDefinitionMode } from "../settings/gameSettings.js";
import { isWordHintAutoSelectMode } from "../settings/wordHintMode.js";
import {
  getLastSelectedPresetId,
  setLastSelectedPresetId,
} from "../game/runPresetProgress.js";
import { normalizeRunPresetId } from "../game/runPresetDefinitions.js";
import { getSlotProfile, persistPlayerProfile } from "./playerProfile.js";
import {
  CASUAL_EXPERIENCE_PRESET_ID,
  CLASSIC_EXPERIENCE_PRESET_ID,
  normalizeSlotExperienceMode,
  presetIdForExperienceMode,
  wordDefinitionModeForExperienceMode,
  wordHintModeForExperienceMode,
} from "./slotExperienceModePure.js";
import { resolveCasualTutorialExperience } from "../tutorial/firstWordTutorialCasualFlow.js";

export {
  CLASSIC_EXPERIENCE_PRESET_ID,
  CASUAL_EXPERIENCE_PRESET_ID,
  normalizeSlotExperienceMode,
  presetIdForExperienceMode,
  wordDefinitionModeForExperienceMode,
  wordHintModeForExperienceMode,
} from "./slotExperienceModePure.js";

/** @typedef {import('./slotExperienceModePure.js').SlotExperienceMode} SlotExperienceMode */

/** @param {number} index @returns {SlotExperienceMode | null} */
export function getSlotExperienceMode(index) {
  return normalizeSlotExperienceMode(getSlotProfile(clampSaveSlotIndex(index)).experienceMode);
}

/**
 * @param {number} slotIndex
 * @param {string | null | undefined} runPresetId
 */
export function isCasualTutorialExperienceForSlot(slotIndex, runPresetId) {
  return resolveCasualTutorialExperience(getSlotExperienceMode(slotIndex), runPresetId);
}

/** @param {number} index @returns {boolean} */
export function hasSlotExperienceModeChosen(index) {
  return getSlotExperienceMode(index) != null;
}

/**
 * 仅在玩家主动选择体验模式时调用；勿在启动/切槽时覆盖设置页已保存的释义与提示偏好。
 * @param {number} index
 */
export function syncWordHintModeFromSlotExperience(index) {
  const mode = getSlotExperienceMode(index);
  if (!mode) return;
  setWordHintMode(wordHintModeForExperienceMode(mode));
  setWordDefinitionMode(wordDefinitionModeForExperienceMode(mode));
}

/**
 * @param {number} index
 * @param {SlotExperienceMode} mode
 */
export function applySlotExperienceMode(index, mode) {
  const ix = clampSaveSlotIndex(index);
  const normalized = normalizeSlotExperienceMode(mode);
  if (!normalized) return;

  const prof = getSlotProfile(ix);
  prof.experienceMode = normalized;
  persistPlayerProfile();

  syncWordHintModeFromSlotExperience(ix);

  mutateSlotCareer(ix, (career) => {
    setLastSelectedPresetId(career, presetIdForExperienceMode(normalized));
  });
  flushSaveStorageSync();
}

/**
 * 老存档静默回填 experienceMode，避免已玩过槽位再弹窗。
 * @param {number} index
 * @returns {boolean} 是否写入
 */
export function backfillSlotExperienceModeIfNeeded(index) {
  const ix = clampSaveSlotIndex(index);
  if (hasSlotExperienceModeChosen(ix)) return false;

  const career = normalizeSlotCareerStats(getSlotCareer(ix) ?? createEmptySlotCareerStats());
  if (!hasSlotCompletedAnyRun(career)) return false;

  const presetId = normalizeRunPresetId(getLastSelectedPresetId(career));
  let mode = /** @type {SlotExperienceMode} */ ("classic");
  if (presetId === CASUAL_EXPERIENCE_PRESET_ID || isWordHintAutoSelectMode(getWordHintMode())) {
    mode = "casual";
  }

  const prof = getSlotProfile(ix);
  prof.experienceMode = mode;
  persistPlayerProfile();
  return true;
}

/**
 * @param {number} index
 * @returns {boolean}
 */
export function shouldShowExperienceModeChoice(index) {
  const ix = clampSaveSlotIndex(index);
  backfillSlotExperienceModeIfNeeded(ix);
  if (hasSlotExperienceModeChosen(ix)) return false;

  const career = normalizeSlotCareerStats(getSlotCareer(ix) ?? createEmptySlotCareerStats());
  if (hasSlotCompletedAnyRun(career)) {
    backfillSlotExperienceModeIfNeeded(ix);
    return false;
  }
  return true;
}
