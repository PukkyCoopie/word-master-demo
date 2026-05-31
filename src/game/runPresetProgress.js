import { RUN_PRESET_DEFINITIONS } from "./runPresetDefinitions.js";
import { normalizeRunPresetId } from "./runPresetDefinitions.js";

export const INITIAL_UNLOCKED_PRESET_COUNT = 2;

/**
 * @param {string} presetId
 * @returns {number}
 */
export function getPresetIndexById(presetId) {
  const id = normalizeRunPresetId(presetId);
  const idx = RUN_PRESET_DEFINITIONS.findIndex((p) => p.id === id);
  return idx >= 0 ? idx : 0;
}

/**
 * @param {number} index
 * @returns {string}
 */
export function getPresetIdAtBrowseIndex(index) {
  const n = RUN_PRESET_DEFINITIONS.length;
  const ix = Math.max(0, Math.min(n - 1, Math.floor(Number(index) || 0)));
  return RUN_PRESET_DEFINITIONS[ix]?.id ?? RUN_PRESET_DEFINITIONS[0].id;
}

/**
 * 浏览全部预设（含未解锁），按定义顺序循环。
 * @param {number} currentIndex
 * @param {number} delta -1 上一项，+1 下一项
 * @returns {number}
 */
export function stepPresetBrowseIndex(currentIndex, delta) {
  const n = RUN_PRESET_DEFINITIONS.length;
  if (n <= 0) return 0;
  const idx = Math.max(0, Math.min(n - 1, Math.floor(Number(currentIndex) || 0)));
  return (idx + delta + n) % n;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 * @returns {string[]}
 */
export function getPresetsWonWith(career) {
  const raw = career?.presetsWonWith;
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter((id) => RUN_PRESET_DEFINITIONS.some((p) => p.id === id));
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function getUnlockedPresetCount(career) {
  const won = getPresetsWonWith(career).length;
  return Math.min(RUN_PRESET_DEFINITIONS.length, INITIAL_UNLOCKED_PRESET_COUNT + won);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 * @returns {string[]}
 */
export function getUnlockedPresetIds(career) {
  const n = getUnlockedPresetCount(career);
  return RUN_PRESET_DEFINITIONS.slice(0, n).map((p) => p.id);
}

/**
 * @param {string} presetId
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function isPresetUnlocked(presetId, career) {
  const id = normalizeRunPresetId(presetId);
  return getUnlockedPresetIds(career).includes(id);
}

/**
 * @param {string} presetId
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 */
export function isPresetWonWith(presetId, career) {
  const id = normalizeRunPresetId(presetId);
  return getPresetsWonWith(career).includes(id);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career
 * @param {number} delta -1 上一项，+1 下一项
 * @param {string} currentId
 * @returns {string}
 */
export function stepUnlockedPresetId(career, currentId, delta) {
  const unlocked = getUnlockedPresetIds(career);
  if (!unlocked.length) return normalizeRunPresetId(currentId);
  const cur = normalizeRunPresetId(currentId);
  let idx = unlocked.indexOf(cur);
  if (idx < 0) idx = 0;
  const next = (idx + delta + unlocked.length) % unlocked.length;
  return unlocked[next];
}

/**
 * 首次用某预设通关时追加记录（解锁下一预设）。
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} presetId
 * @returns {boolean} 是否新记录
 */
export function recordPresetWin(career, presetId) {
  const id = normalizeRunPresetId(presetId);
  if (!Array.isArray(career.presetsWonWith)) career.presetsWonWith = [];
  if (career.presetsWonWith.includes(id)) return false;
  career.presetsWonWith.push(id);
  return true;
}

/** @param {import('../save/runSaveSchema.js').SlotCareerStats | null | undefined} career */
export function getLastSelectedPresetId(career) {
  const id = String(career?.lastSelectedPresetId ?? "").trim();
  if (id && isPresetUnlocked(id, career)) return id;
  return RUN_PRESET_DEFINITIONS[0].id;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} presetId
 */
export function setLastSelectedPresetId(career, presetId) {
  career.lastSelectedPresetId = normalizeRunPresetId(presetId);
}
