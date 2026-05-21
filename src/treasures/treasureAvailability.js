/**
 * 宝藏解锁与商店池过滤（`unlockPrerequisite` / `poolPrerequisite` 写在各 treasure_*.js 的 default 上）
 */

/** @typedef {Object} TreasurePoolSnapshot
 * @property {unknown[]} [deck]
 * @property {boolean} [isEndlessRun]
 * @property {import('./treasureRunState.js').TreasureRunState} [runState]
 * @property {readonly (null | { treasureAccessoryId?: string | null })[]} [ownedTreasureSlots]
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

/** @param {unknown[]} deck */
function deckHasGoldWithCoinAccessory(deck) {
  for (const c of deck ?? []) {
    if (!c || typeof c !== "object") continue;
    const card = /** @type {{ materialId?: string, accessoryId?: string }} */ (c);
    if (card.materialId === "gold" && card.accessoryId === "coin") return true;
  }
  return false;
}

/** @param {unknown[]} deck */
function countDistinctLetterRarities(deck) {
  const s = new Set();
  for (const c of deck ?? []) {
    if (c && typeof c === "object" && /** @type {{ rarity?: string }} */ (c).rarity) {
      s.add(String(/** @type {{ rarity?: string }} */ (c).rarity));
    }
  }
  return s.size;
}

/** @param {unknown[]} deck */
function deckAllCommon(deck) {
  const list = deck ?? [];
  if (!list.length) return false;
  for (const c of list) {
    if (!c || typeof c !== "object") return false;
    if (/** @type {{ rarity?: string }} */ (c).rarity !== "common") return false;
  }
  return true;
}

/** @param {unknown[]} deck */
function deckHalfOrMoreRare(deck) {
  const list = deck ?? [];
  if (!list.length) return false;
  let rare = 0;
  for (const c of list) {
    if (c && typeof c === "object" && /** @type {{ rarity?: string }} */ (c).rarity === "rare") rare += 1;
  }
  return rare * 2 >= list.length;
}

/**
 * @param {import('./treasureTypes.js').TreasureDef & { unlockPrerequisite?: object }} def
 * @param {TreasurePoolSnapshot} snap
 */
export function isTreasureUnlocked(def, snap) {
  const pre = def.unlockPrerequisite;
  if (!pre || typeof pre !== "object") return true;
  const deck = snap.deck ?? [];
  const rs = snap.runState;

  switch (pre.type) {
    case "deckLegendaryMin":
      return countDeckByLetterRarity(deck, "legendary") >= Math.max(0, Number(pre.min) || 0);
    case "deckEpicMin":
      return countDeckByLetterRarity(deck, "epic") >= Math.max(0, Number(pre.min) || 0);
    case "deckRareHalf":
      return deckHalfOrMoreRare(deck);
    case "deckAllCommon":
      return deckAllCommon(deck);
    case "deckIceMin":
      return countDeckMaterial(deck, "ice") >= Math.max(0, Number(pre.min) || 0);
    case "deckRarityKindsMin":
      return countDistinctLetterRarities(deck) >= Math.max(0, Number(pre.min) || 0);
    case "deckGoldCoinAccessory":
      return deckHasGoldWithCoinAccessory(deck);
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
    case "allOwnedTreasuresHaveAccessory": {
      const owned = snap.ownedTreasureSlots;
      if (!Array.isArray(owned) || !owned.length) return false;
      return owned.every((s) => s && String(s.treasureAccessoryId ?? "").trim() !== "");
    }
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
  return defs.filter((d) => isTreasureUnlocked(d, snap) && meetsTreasurePoolPrerequisite(d, snap));
}
