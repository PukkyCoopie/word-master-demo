/**
 * 宝藏解锁与商店池过滤（`unlockPrerequisite` / `poolPrerequisite` 写在各 treasure_*.js 的 default 上）
 */

import { readTreasureAccessoryIds } from "../accessories/accessoryState.js";
import { getTreasureDef } from "./treasureRegistry.js";

/** @typedef {Object} TreasurePoolDerivedStats
 * @property {Record<string, number>} deckLetterRarityCounts
 * @property {Record<string, number>} deckMaterialCounts
 * @property {boolean} deckHalfOrMoreRare
 * @property {boolean} deckAllCommon
 * @property {boolean} deckHasGoldCoinAccessory
 * @property {number} ownedLegendaryCount
 * @property {number} ownedEpicCount
 * @property {boolean} allOwnedTreasuresHaveAccessory
 */

/** @typedef {Object} TreasurePoolSnapshot
 * @property {unknown[]} [deck]
 * @property {boolean} [isEndlessRun]
 * @property {import('./treasureRunState.js').TreasureRunState} [runState]
 * @property {readonly (null | { treasureAccessoryIds?: unknown, treasureAccessoryId?: string | null, treasureId?: string | null })[]} [ownedTreasureSlots]
 * @property {TreasurePoolDerivedStats} [derivedStats]
 */

/** @param {unknown[]} deck @param {string} rarity */
function countDeckByLetterRarity(deck, rarity) {
  let n = 0;
  for (const c of deck ?? []) {
    if (c && typeof c === "object" && /** @type {{ rarity?: string }} */ (c).rarity === rarity) n += 1;
  }
  return n;
}

/** @param {unknown[]} deck @param {string} materialId */
function countDeckMaterial(deck, materialId) {
  let n = 0;
  for (const c of deck ?? []) {
    if (c && typeof c === "object" && /** @type {{ materialId?: string }} */ (c).materialId === materialId) {
      n += 1;
    }
  }
  return n;
}

/**
 * 单次扫描牌库/已拥有槽位，供 filterTreasureDefsForPool 批量复用（避免每个宝藏定义重复扫 deck）。
 * @param {TreasurePoolSnapshot} snap
 * @returns {TreasurePoolDerivedStats}
 */
export function attachTreasurePoolDerivedStats(snap) {
  if (snap.derivedStats) return snap.derivedStats;

  const deck = snap.deck ?? [];
  /** @type {Record<string, number>} */
  const deckLetterRarityCounts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  /** @type {Record<string, number>} */
  const deckMaterialCounts = {};
  let deckRare = 0;
  let deckAllCommon = deck.length > 0;
  let deckHasGoldCoinAccessory = false;

  for (const c of deck) {
    if (!c || typeof c !== "object") {
      deckAllCommon = false;
      continue;
    }
    const card = /** @type {{ rarity?: string, materialId?: string, accessoryId?: string }} */ (c);
    const rarity = card.rarity;
    if (rarity && Object.prototype.hasOwnProperty.call(deckLetterRarityCounts, rarity)) {
      deckLetterRarityCounts[rarity] += 1;
    }
    if (rarity === "rare") deckRare += 1;
    if (rarity !== "common") deckAllCommon = false;
    const materialId = card.materialId;
    if (materialId) {
      deckMaterialCounts[materialId] = (deckMaterialCounts[materialId] ?? 0) + 1;
    }
    if (card.materialId === "gold" && card.accessoryId === "coin") {
      deckHasGoldCoinAccessory = true;
    }
  }

  const owned = snap.ownedTreasureSlots ?? [];
  let ownedLegendaryCount = 0;
  let ownedEpicCount = 0;
  let allOwnedTreasuresHaveAccessory = owned.length > 0;
  for (const s of owned) {
    if (!s?.treasureId) {
      allOwnedTreasuresHaveAccessory = false;
      continue;
    }
    const def = getTreasureDef(String(s.treasureId));
    if (def?.rarity === "legendary") ownedLegendaryCount += 1;
    if (def?.rarity === "epic") ownedEpicCount += 1;
    if (!readTreasureAccessoryIds(s).length) {
      allOwnedTreasuresHaveAccessory = false;
    }
  }
  if (!owned.length) allOwnedTreasuresHaveAccessory = false;

  snap.derivedStats = {
    deckLetterRarityCounts,
    deckMaterialCounts,
    deckHalfOrMoreRare: deck.length > 0 && deckRare * 2 >= deck.length,
    deckAllCommon,
    deckHasGoldCoinAccessory,
    ownedLegendaryCount,
    ownedEpicCount,
    allOwnedTreasuresHaveAccessory,
  };
  return snap.derivedStats;
}

/**
 * @param {TreasurePoolSnapshot} snap
 * @param {TreasurePoolDerivedStats} derived
 * @param {string} rarity
 */
function deckLetterRarityCountFromDerived(snap, derived, rarity) {
  const fromDerived = derived.deckLetterRarityCounts?.[rarity];
  if (typeof fromDerived === "number") return fromDerived;
  return countDeckByLetterRarity(snap.deck ?? [], rarity);
}

/**
 * @param {TreasurePoolSnapshot} snap
 * @param {TreasurePoolDerivedStats} derived
 * @param {string} materialId
 */
function deckMaterialCountFromDerived(snap, derived, materialId) {
  const fromDerived = derived.deckMaterialCounts?.[materialId];
  if (typeof fromDerived === "number") return fromDerived;
  return countDeckMaterial(snap.deck ?? [], materialId);
}

/**
 * @param {import('./treasureTypes.js').TreasureDef & { unlockPrerequisite?: object }} def
 * @param {TreasurePoolSnapshot} snap
 */
export function isTreasureUnlocked(def, snap) {
  const pre = def.unlockPrerequisite;
  if (!pre || typeof pre !== "object") return true;
  const derived = snap.derivedStats ?? attachTreasurePoolDerivedStats(snap);
  const deck = snap.deck ?? [];
  const rs = snap.runState;

  switch (pre.type) {
    case "deckLegendaryMin":
      return deckLetterRarityCountFromDerived(snap, derived, "legendary") >= Math.max(0, Number(pre.min) || 0);
    case "deckEpicMin":
      return deckLetterRarityCountFromDerived(snap, derived, "epic") >= Math.max(0, Number(pre.min) || 0);
    case "deckRareHalf":
      return derived.deckHalfOrMoreRare;
    case "deckAllCommon":
      return derived.deckAllCommon;
    case "deckIceMin":
      return deckMaterialCountFromDerived(snap, derived, "ice") >= Math.max(0, Number(pre.min) || 0);
    case "deckLuckyMin":
      return deckMaterialCountFromDerived(snap, derived, "lucky") >= Math.max(0, Number(pre.min) || 0);
    case "deckFireMin":
      return deckMaterialCountFromDerived(snap, derived, "fire") >= Math.max(0, Number(pre.min) || 0);
    case "deckWaterMin":
      return deckMaterialCountFromDerived(snap, derived, "water") >= Math.max(0, Number(pre.min) || 0);
    case "ownedLegendaryMin":
      return derived.ownedLegendaryCount >= Math.max(0, Number(pre.min) || 0);
    case "ownedEpicMinOrLegendaryMin": {
      const epicMin = Math.max(0, Math.floor(Number(pre.epicMin) || 0));
      const legendaryMin = Math.max(0, Math.floor(Number(pre.legendaryMin) || 0));
      return derived.ownedEpicCount >= epicMin || derived.ownedLegendaryCount >= legendaryMin;
    }
    case "deckRarityKindsMin": {
      const added = rs?.runDeckAddedRarities;
      const kinds = added instanceof Set ? added.size : 0;
      return kinds >= Math.max(0, Number(pre.min) || 0);
    }
    case "deckGoldCoinAccessory":
      return derived.deckHasGoldCoinAccessory;
    case "endlessMode":
      return snap.isEndlessRun === true;
    case "allCommonBossWin":
      return rs?.allCommonBossClearRecorded === true;
    case "chapterAllDiscardsExhausted":
      return rs?.chapterAllDiscardsExhausted === true;
    case "chapterNoNounSpelled":
      return rs?.chapterNoNounUnlocked === true;
    case "chapterNoAdjSpelled":
      return rs?.chapterNoAdjUnlocked === true;
    case "chapterNoVerbSpelled":
      return rs?.chapterNoVerbUnlocked === true;
    case "levelAllFiveVowels":
      return rs?.levelAllFiveVowelsUnlocked === true;
    case "runSpellsCastMin":
      return (rs?.runSpellsCastCount ?? 0) >= Math.max(0, Number(pre.min) || 0);
    case "runUpgradesUsedMin":
      return (rs?.runUpgradesUsedCount ?? 0) >= Math.max(0, Number(pre.min) || 0);
    case "everDiscardedFullWord":
      return rs?.everDiscardedFullWord === true;
    case "discardWordLen7OrSoldBlueprint98":
      return rs?.everDiscardedWordLen7Plus === true || rs?.soldBlueprintTreasure98 === true;
    case "allOwnedTreasuresHaveAccessory":
      return derived.allOwnedTreasuresHaveAccessory;
    case "everTwoTreasuresWithAccessory":
      return rs?.everTwoTreasuresWithAccessoryUnlocked === true;
    case "levelAllLegendaryDeckExhausted":
      return rs?.levelAllLegendaryDeckExhaustedUnlocked === true;
    case "runIceMaterialShattered":
      return rs?.runIceMaterialShattered === true;
    default:
      return true;
  }
}

/**
 * @param {import('./treasureTypes.js').TreasureDef & { poolPrerequisite?: object }} def
 * @param {TreasurePoolSnapshot} snap
 */
export function meetsTreasurePoolPrerequisite(def, snap) {
  const pre = def.poolPrerequisite;
  if (!pre || typeof pre !== "object") return true;
  const rs = snap.runState;
  switch (pre.type) {
    case "treasure29SelfDestructed":
      return rs?.treasure29SelfDestructed === true;
    case "playedAllGoldWord":
      return rs?.playedAllGoldWord === true;
    case "probabilityEffectTriggered":
      return rs?.probabilityEffectTriggered === true;
    default:
      return true;
  }
}

/**
 * @param {import('./treasureTypes.js').TreasureDef[]} defs
 * @param {TreasurePoolSnapshot} snap
 */
export function filterTreasureDefsForPool(defs, snap) {
  attachTreasurePoolDerivedStats(snap);
  return defs.filter((d) => isTreasureUnlocked(d, snap) && meetsTreasurePoolPrerequisite(d, snap));
}

/**
 * 法术/效果随机授予宝藏池：含 `shopEligible: false` 的专属掉落（如传说法术），仍受解锁与 pool 条件约束。
 * @param {import('./treasureTypes.js').TreasureDef[]} defs
 * @param {TreasurePoolSnapshot} snap
 * @param {string | null} [rarityFilter]
 */
export function filterTreasureDefsForSpellGrantPool(defs, snap, rarityFilter = null) {
  const tier = rarityFilter ? String(rarityFilter) : null;
  const filtered = tier ? defs.filter((d) => d.rarity === tier) : defs;
  return filterTreasureDefsForPool(filtered, snap);
}
