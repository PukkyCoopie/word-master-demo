/** @typedef {'classic' | 'casual'} SlotExperienceMode */

/** @typedef {'off' | 'button' | 'definition'} WordDefinitionMode */

export const CLASSIC_EXPERIENCE_PRESET_ID = "preset_01";
export const CASUAL_EXPERIENCE_PRESET_ID = "preset_11";

const EXPERIENCE_MODE_IDS = new Set(["classic", "casual"]);

/** @param {unknown} value @returns {SlotExperienceMode | null} */
export function normalizeSlotExperienceMode(value) {
  const s = String(value ?? "");
  return EXPERIENCE_MODE_IDS.has(/** @type {SlotExperienceMode} */ (s))
    ? /** @type {SlotExperienceMode} */ (s)
    : null;
}

/** @param {SlotExperienceMode} mode @returns {import('../settings/wordHintMode.js').WordHintMode} */
export function wordHintModeForExperienceMode(mode) {
  return mode === "casual" ? "autoSelect" : "ripple";
}

/** @param {SlotExperienceMode} mode @returns {WordDefinitionMode} */
export function wordDefinitionModeForExperienceMode(mode) {
  return mode === "casual" ? "definition" : "button";
}

/** @param {SlotExperienceMode} mode @returns {string} */
export function presetIdForExperienceMode(mode) {
  return mode === "casual" ? CASUAL_EXPERIENCE_PRESET_ID : CLASSIC_EXPERIENCE_PRESET_ID;
}
