import { getTreasureDef } from "../treasures/treasureRegistry.js";
import {
  COLLECTION_PREREQUISITE_OPACITY,
  COLLECTION_UNKNOWN_OPACITY,
} from "./collectionDisplayUtils.js";

/** @typedef {'discovered' | 'unknown' | 'prerequisite-locked'} CollectionEntryState */

/**
 * @param {string | null | undefined} treasureId
 */
export function treasureHasUnlockPrerequisite(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return false;
  const pre = getTreasureDef(id)?.unlockPrerequisite;
  return Boolean(pre && typeof pre === "object");
}

/** 收藏图鉴：含 `unlockPrerequisite` 与局内商店 `poolPrerequisite` */
export function treasureHasCollectionPrerequisite(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return false;
  const def = getTreasureDef(id);
  const unlockPre = def?.unlockPrerequisite;
  const poolPre = def?.poolPrerequisite;
  return (
    Boolean(unlockPre && typeof unlockPre === "object") ||
    Boolean(poolPre && typeof poolPre === "object")
  );
}

/**
 * @param {string | null | undefined} treasureId
 * @param {Iterable<string> | null | undefined} discoveredTreasureIds
 * @returns {CollectionEntryState}
 */
export function resolveCollectionTreasureEntryState(treasureId, discoveredTreasureIds) {
  const id = String(treasureId ?? "").trim();
  const discovered = new Set([...(discoveredTreasureIds ?? [])].map(String)).has(id);
  if (discovered) return "discovered";
  if (treasureHasCollectionPrerequisite(id)) return "prerequisite-locked";
  return "unknown";
}

/**
 * @param {string | null | undefined} spellId
 * @param {Iterable<string> | null | undefined} discoveredSpellIds
 * @returns {CollectionEntryState}
 */
export function resolveCollectionSpellEntryState(spellId, discoveredSpellIds) {
  const id = String(spellId ?? "").trim();
  const discovered = new Set([...(discoveredSpellIds ?? [])].map(String)).has(id);
  return discovered ? "discovered" : "unknown";
}

/**
 * @param {string | null | undefined} upgradeTreasureId
 * @param {Iterable<string> | null | undefined} discoveredUpgradeIds
 * @returns {CollectionEntryState}
 */
export function resolveCollectionUpgradeEntryState(upgradeTreasureId, discoveredUpgradeIds) {
  const id = String(upgradeTreasureId ?? "").trim();
  const discovered = new Set([...(discoveredUpgradeIds ?? [])].map(String)).has(id);
  return discovered ? "discovered" : "unknown";
}

/**
 * @param {string | null | undefined} pairId
 * @param {number | null | undefined} discoveredTier
 * @returns {CollectionEntryState}
 */
export function resolveCollectionVoucherEntryState(pairId, discoveredTier) {
  const id = String(pairId ?? "").trim();
  if (!id) return "unknown";
  const tier = Math.max(0, Math.min(2, Math.floor(Number(discoveredTier) || 0)));
  return tier >= 1 ? "discovered" : "unknown";
}

/** @param {CollectionEntryState} state */
export function collectionEntryOpacityForState(state) {
  if (state === "discovered") return 1;
  if (state === "prerequisite-locked") return COLLECTION_PREREQUISITE_OPACITY;
  return COLLECTION_UNKNOWN_OPACITY;
}

/** @param {CollectionEntryState} state */
export function isCollectionEntryLocked(state) {
  return state !== "discovered";
}
