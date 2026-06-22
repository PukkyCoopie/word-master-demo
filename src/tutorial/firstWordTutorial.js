import { Capacitor } from "@capacitor/core";
import { RUN_START_LEVEL_INDEX } from "../levelDefinitions.js";
import { getBaseScoreForRarity, getRarityForLetter } from "../composables/useScoring.js";
import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import {
  isFirstWordTutorialCompleted,
  getActiveSaveSlotIndex,
  resetFirstWordTutorialIfNoRunProgress,
} from "../profile/playerProfile.js";
import { localHasSaveData } from "../save/cloudSave/cloudSaveBundle.js";
import { CLOUD_ARCHIVE_NAME } from "../save/cloudSave/cloudSaveConstants.js";
import { cloudSaveGetArchiveList } from "../save/cloudSave/cloudSaveApi.js";
import { localSaveHasNoRunProgress, isSlotFreshForFirstWordTutorial } from "../save/localSaveRunProgress.js";

/** @typedef {{ row: number, col: number, letter: string }} TutorialLetterPlacement */

/** @type {readonly TutorialLetterPlacement[]} */
export const TUTORIAL_LETTER_PLACEMENTS = Object.freeze([
  { row: 0, col: 1, letter: "p" },
  { row: 2, col: 0, letter: "l" },
  { row: 1, col: 3, letter: "a" },
  { row: 3, col: 2, letter: "y" },
]);

/** 选字顺序（拼 play） */
/** @type {readonly TutorialLetterPlacement[]} */
export const TUTORIAL_SELECT_ORDER = Object.freeze([...TUTORIAL_LETTER_PLACEMENTS]);

let pendingTutorialAutoStart = false;
let tutorialAutoStartAttempted = false;

/** 仅原生 App 在加载完成后自动开新局并进入首词教程；Web 留在主菜单。 */
export function isFirstWordTutorialAutoStartEnabled() {
  return Capacitor.isNativePlatform();
}

export function markPendingTutorialAutoStart() {
  if (!isFirstWordTutorialAutoStartEnabled()) return;
  pendingTutorialAutoStart = true;
}

export function resetTutorialAutoStartState() {
  tutorialAutoStartAttempted = false;
}

/** @returns {boolean} */
export function hasTutorialAutoStartAttempted() {
  return tutorialAutoStartAttempted;
}

export function markTutorialAutoStartAttempted() {
  tutorialAutoStartAttempted = true;
}

/** 云存档冲突后选择本地新档 / 新建存档时调用。 */
export function prepareFirstWordTutorialAfterFreshLocalSaveChoice() {
  if (!localSaveHasNoRunProgress()) return false;
  resetFirstWordTutorialIfNoRunProgress();
  markPendingTutorialAutoStart();
  resetTutorialAutoStartState();
  return true;
}

/** @returns {boolean} */
export function consumePendingTutorialAutoStart() {
  const v = pendingTutorialAutoStart;
  pendingTutorialAutoStart = false;
  return v;
}

/** @returns {boolean} */
export function hasPendingTutorialAutoStart() {
  return pendingTutorialAutoStart;
}

/**
 * @param {Record<string, unknown>[][]} grid
 * @param {() => void} [touchGrid]
 * @param {Record<string, number> | null} [rarityLevelsByRarity]
 */
export function applyTutorialPlayLetters(grid, touchGrid, rarityLevelsByRarity = null) {
  if (!Array.isArray(grid)) return;
  for (const { row, col, letter } of TUTORIAL_LETTER_PLACEMENTS) {
    const tile = grid[row]?.[col];
    if (!tile || tile.bossGridBlocked) continue;
    tile.letter = resolveLetterFromRaw(letter);
    tile.isWildcard = false;
    tile.selected = false;
    const rarity = getRarityForLetter(letter);
    tile.rarity = rarity;
    tile.baseScore = getBaseScoreForRarity(rarity, rarityLevelsByRarity);
    syncTileStateToDeckCard(tile);
  }
  touchGrid?.();
}

/** @returns {boolean} */
export function isLocalSaveFreshForTutorial() {
  return !localHasSaveData();
}

/**
 * @returns {Promise<boolean>}
 */
export async function isCloudSaveFreshForTutorial() {
  if (!Capacitor.isNativePlatform()) return true;
  try {
    const archives = await cloudSaveGetArchiveList();
    return !archives.some((item) => item.name === CLOUD_ARCHIVE_NAME);
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<boolean>}
 */
export async function isFreshSaveForTutorial() {
  if (!isLocalSaveFreshForTutorial()) return false;
  return isCloudSaveFreshForTutorial();
}

/** @returns {boolean} */
export function shouldAutoStartFirstWordTutorial(slotIndex = getActiveSaveSlotIndex()) {
  if (!isFirstWordTutorialAutoStartEnabled()) return false;
  if (!isSlotFreshForFirstWordTutorial(slotIndex)) return false;
  if (!hasPendingTutorialAutoStart()) return false;
  if (isLocalSaveFreshForTutorial()) return true;
  return localSaveHasNoRunProgress();
}

/** @param {number} [levelIndex] @param {number} [slotIndex] */
export function shouldRunFirstWordTutorialInGame(
  levelIndex = RUN_START_LEVEL_INDEX,
  slotIndex = getActiveSaveSlotIndex(),
) {
  if (!isSlotFreshForFirstWordTutorial(slotIndex)) return false;
  return levelIndex === RUN_START_LEVEL_INDEX;
}

/**
 * @param {number} row
 * @param {number} col
 * @param {number} selectStep 0..3
 */
export function isTutorialSelectTarget(row, col, selectStep) {
  const target = TUTORIAL_SELECT_ORDER[selectStep];
  if (!target) return false;
  return target.row === row && target.col === col;
}

/**
 * 难度 0 首次进店单卡区 slot 0 保底宝藏（火花 / 风筝）。
 * @param {readonly object[] | null | undefined} offers
 * @returns {{ treasureId: string | null, emoji: string, name: string }}
 */
export function resolveGuaranteedFirstShopTreasureOffer(offers) {
  /** @type {object | undefined} */
  const slot =
    offers?.[0]?.kind === "offer" && offers[0].offerType === "treasure"
      ? offers[0]
      : offers?.find((o) => o?.kind === "offer" && o.offerType === "treasure");
  if (!slot) return { treasureId: null, emoji: "", name: "" };
  return {
    treasureId: String(slot.treasureId ?? ""),
    emoji: String(slot.emoji ?? ""),
    name: String(slot.name ?? ""),
  };
}
