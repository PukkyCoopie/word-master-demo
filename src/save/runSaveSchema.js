/** @typedef {'playing' | 'settlement' | 'shop' | 'run_end_win' | 'run_end_fail'} RunSavePhase */

/** @typedef {Object} RunSaveMeta
 * @property {string} seedDisplay
 * @property {string} levelId
 * @property {number} money
 * @property {boolean} isEndlessRun
 * @property {RunSavePhase} phase
 * @property {(string | null)[]} ownedTreasureEmojis
 * @property {number} savedAt
 * @property {string} [runPresetId]
 * @property {number} [runDifficultyIndex]
 */

/** @typedef {Object} SlotCareerStats
 * @property {number} runsStarted
 * @property {number} runsCompleted
 * @property {number} runsWon
 * @property {string} bestWord
 * @property {number} bestWordScore
 * @property {number} totalLettersUsed
 * @property {number} totalLettersDiscarded
 * @property {number} totalShopPurchases
 * @property {number} totalRerolls
 * @property {number | null} lastRunEndedAt
 * @property {string[]} presetsWonWith
 * @property {string} [lastSelectedPresetId]
 * @property {number} [highestDifficultyBeaten]
 * @property {Record<string, number>} [presetHighestDifficultyWon]
 * @property {number} [lastSelectedDifficultyIndex]
 */

/** @typedef {Object} RunSaveSlot
 * @property {number} savedAt
 * @property {string} appVersion
 * @property {RunSaveMeta} meta
 * @property {SlotCareerStats} career
 * @property {import('./runSavePayload.js').RunSavePayload} payload
 */

/** @typedef {Object} SaveEnvelope
 * @property {number} schemaVersion
 * @property {number} slotCount
 * @property {(RunSaveSlot | null)[]} slots
 */

export const SAVE_SCHEMA_VERSION = 1;
export const SAVE_SLOT_COUNT = 3;
export const RUN_SAVES_STORAGE_KEY = "word_master_run_saves_v1";

/** @type {readonly RunSavePhase[]} */
export const RUN_SAVE_PHASES = Object.freeze([
  "playing",
  "settlement",
  "shop",
  "run_end_win",
  "run_end_fail",
]);

/** @returns {SlotCareerStats} */
export function createEmptySlotCareerStats() {
  return {
    runsStarted: 0,
    runsCompleted: 0,
    runsWon: 0,
    bestWord: "",
    bestWordScore: 0,
    totalLettersUsed: 0,
    totalLettersDiscarded: 0,
    totalShopPurchases: 0,
    totalRerolls: 0,
    lastRunEndedAt: null,
    presetsWonWith: [],
    lastSelectedPresetId: "",
    highestDifficultyBeaten: -1,
    presetHighestDifficultyWon: {},
    lastSelectedDifficultyIndex: 0,
  };
}

/** @returns {SaveEnvelope} */
export function createEmptySaveEnvelope() {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    slotCount: SAVE_SLOT_COUNT,
    slots: Array.from({ length: SAVE_SLOT_COUNT }, () => null),
  };
}

/** @param {unknown} phase @returns {RunSavePhase} */
export function normalizeRunSavePhase(phase) {
  const s = String(phase ?? "");
  return /** @type {RunSavePhase} */ (
    RUN_SAVE_PHASES.includes(/** @type {RunSavePhase} */ (s)) ? s : "playing"
  );
}

/** @param {unknown} value @returns {number} */
export function clampSaveSlotIndex(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, n));
}
