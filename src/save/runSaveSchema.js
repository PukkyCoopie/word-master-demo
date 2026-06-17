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
 * @property {string[]} [discoveredTreasureIds]
 * @property {string[]} [shopAppearedPrerequisiteTreasureIds]
 * @property {Record<string, number>} [shopPrerequisiteTreasureSingleCardAppearanceCounts]
 * @property {string[]} [discoveredSpellIds]
 * @property {string[]} [discoveredUpgradeIds]
 * @property {Record<string, 1 | 2>} [discoveredVoucherTiers]
 * @property {string[]} [discoveredMaterialIds]
 * @property {string[]} [discoveredAccessoryIds]
 * @property {import('../collection/collectionTypes.js').CollectionWordRecord[]} [scoreLeaderboard]
 * @property {import('../collection/collectionTypes.js').CollectionWordRecord[]} [lengthLeaderboard]
 * @property {string[]} [collectionNewDiscoveryKeys]
 * @property {string[]} [collectionTabsPendingNewClear]
 * @property {string[]} [unlockedAchievementIds]
 * @property {Record<string, number>} [taptapReportedAchievementSteps]
 * @property {number} [taptapReportedBestSingleWordScore]
 * @property {number} [totalWordsSubmitted]
 * @property {number} [peakWalletAmount]
 * @property {number} [maxLevelIndexReached]
 * @property {boolean} [tapTapEngagementPromptHandled]
 * @property {boolean} [tapTapEngagementAutoPending]
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

export const SAVE_SCHEMA_VERSION = 2;
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
    discoveredTreasureIds: [],
    shopAppearedPrerequisiteTreasureIds: [],
    shopPrerequisiteTreasureSingleCardAppearanceCounts: {},
    discoveredSpellIds: [],
    discoveredUpgradeIds: [],
    discoveredVoucherTiers: {},
    discoveredMaterialIds: [],
    discoveredAccessoryIds: [],
    scoreLeaderboard: [],
    lengthLeaderboard: [],
    collectionNewDiscoveryKeys: [],
    collectionTabsPendingNewClear: [],
    unlockedAchievementIds: [],
    taptapReportedAchievementSteps: {},
    taptapReportedBestSingleWordScore: 0,
    totalWordsSubmitted: 0,
    peakWalletAmount: 0,
    maxLevelIndexReached: -1,
    tapTapEngagementPromptHandled: false,
    tapTapEngagementAutoPending: false,
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

/** 局内进度是否仍可从主菜单「继续」恢复（整局结束后的存档不算可继续） */
export function isContinuableRunPhase(phase) {
  const normalized = normalizeRunSavePhase(phase);
  return normalized !== "run_end_win" && normalized !== "run_end_fail";
}

/** @param {unknown} value @returns {number} */
export function clampSaveSlotIndex(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(SAVE_SLOT_COUNT - 1, n));
}
