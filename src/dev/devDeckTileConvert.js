import { deckCardRaw } from "../game/deckCardSync.js";
import {
  getTileBoardAccessoryTitle,
  getTileMaterialBlockTitle,
  getTreasureAccessoryPanelTitle,
} from "../game/gameConceptCopy.js";
import { getBaseScoreForRarity, getRarityForLetter, RARITY_BY_LETTER } from "../composables/useScoring.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import { SHOP_TILE_PACK_MATERIAL_IDS } from "../shop/shopPackEconomy.js";
import { ALL_ACCESSORY_IDS } from "../accessories/accessoryCatalog.js";
import { accessoryCanEquip } from "../accessories/accessoryResolve.js";
import { normalizeExclusiveTileAccessoryPair, writeEntityAccessory } from "../accessories/accessoryState.js";

const WILDCARD_MATERIAL_ID = "wildcard";
const WILDCARD_TILE_LETTER = "?";
import { WATER_MATERIAL_SCORE_BONUS } from "../game/tileMaterialApply.js";
const FIRE_MATERIAL_MULT_BONUS = 5;

/** 清除材质，恢复为普通字母块 */
export const DEV_DECK_CONVERT_TARGET_PLAIN = "__plain__";

/** 配饰目标 value 前缀（与材质 id 区分） */
export const DEV_DECK_CONVERT_TARGET_ACCESSORY_PREFIX = "accessory:";

/** 清除牌张配饰 */
export const DEV_DECK_CONVERT_TARGET_NO_ACCESSORY = `${DEV_DECK_CONVERT_TARGET_ACCESSORY_PREFIX}__none__`;

/** @type {readonly { value: string, label: string }[]} */
export const DEV_DECK_CONVERT_BASE_SCOPE_OPTIONS = Object.freeze([
  { value: "all", label: "所有" },
  { value: "pct25", label: "25%" },
  { value: "pct50", label: "50%" },
  { value: "pct75", label: "75%" },
  { value: "count1", label: "1 个" },
  { value: "count5", label: "5 个" },
  { value: "count10", label: "10 个" },
  { value: "noMaterial", label: "所有没有材质的" },
]);

/**
 * @returns {readonly { value: string, label: string }[]}
 */
export function buildDevDeckConvertScopeOptions() {
  /** @type {{ value: string, label: string }[]} */
  const letterOptions = [];
  for (const letters of Object.values(RARITY_BY_LETTER)) {
    for (const raw of letters) {
      const display = resolveLetterFromRaw(raw).toUpperCase();
      letterOptions.push({ value: `letter:${raw}`, label: `字母 ${display}` });
    }
  }
  letterOptions.sort((a, b) => a.label.localeCompare(b.label, "zh-Hans-CN"));
  return Object.freeze([...DEV_DECK_CONVERT_BASE_SCOPE_OPTIONS, ...letterOptions]);
}

/**
 * @param {string | null | undefined} target
 * @returns {boolean}
 */
export function isDevDeckConvertAccessoryTarget(target) {
  return String(target ?? "").startsWith(DEV_DECK_CONVERT_TARGET_ACCESSORY_PREFIX);
}

/**
 * @param {string | null | undefined} target
 * @returns {string | null} null 表示清除配饰
 */
export function parseDevDeckConvertAccessoryTarget(target) {
  if (!isDevDeckConvertAccessoryTarget(target)) return null;
  const raw = String(target).slice(DEV_DECK_CONVERT_TARGET_ACCESSORY_PREFIX.length).trim();
  if (!raw || raw === "__none__") return null;
  return raw;
}

/**
 * @param {string | null | undefined} accessoryId
 * @returns {string}
 */
export function getDevDeckConvertAccessoryTargetLabel(accessoryId) {
  if (accessoryId == null || String(accessoryId).trim() === "") return "无配饰";
  const id = String(accessoryId).trim();
  return getTileBoardAccessoryTitle(id) || getTreasureAccessoryPanelTitle(id) || id;
}

/**
 * @returns {readonly { value: string, label: string }[]}
 */
export function buildDevDeckConvertMaterialTargetOptions() {
  /** @type {{ value: string, label: string }[]} */
  const options = [{ value: DEV_DECK_CONVERT_TARGET_PLAIN, label: "普通字母块" }];
  for (const id of SHOP_TILE_PACK_MATERIAL_IDS) {
    const title = getTileMaterialBlockTitle(id);
    options.push({ value: id, label: title || id });
  }
  return Object.freeze(options);
}

/**
 * @returns {readonly { value: string, label: string }[]}
 */
export function buildDevDeckConvertAccessoryTargetOptions() {
  /** @type {{ value: string, label: string }[]} */
  const options = [{ value: DEV_DECK_CONVERT_TARGET_NO_ACCESSORY, label: "无配饰" }];
  for (const id of ALL_ACCESSORY_IDS) {
    if (!accessoryCanEquip(id, "tile")) continue;
    const label = getDevDeckConvertAccessoryTargetLabel(id);
    options.push({ value: `${DEV_DECK_CONVERT_TARGET_ACCESSORY_PREFIX}${id}`, label });
  }
  return Object.freeze(options);
}

/**
 * @returns {Readonly<{ materials: readonly { value: string, label: string }[], accessories: readonly { value: string, label: string }[] }>}
 */
export function buildDevDeckConvertTargetOptionGroups() {
  return Object.freeze({
    materials: buildDevDeckConvertMaterialTargetOptions(),
    accessories: buildDevDeckConvertAccessoryTargetOptions(),
  });
}

/** @deprecated 使用 {@link buildDevDeckConvertTargetOptionGroups} */
export function buildDevDeckConvertTargetOptions() {
  return Object.freeze([
    ...buildDevDeckConvertMaterialTargetOptions(),
    ...buildDevDeckConvertAccessoryTargetOptions(),
  ]);
}

/**
 * @param {unknown} card
 */
function deckCardHasMaterial(card) {
  if (!card || typeof card !== "object") return false;
  if (/** @type {{ isWildcard?: boolean }} */ (card).isWildcard === true) return true;
  return String(/** @type {{ materialId?: unknown }} */ (card).materialId ?? "").trim() !== "";
}

/**
 * @param {unknown} card
 * @param {string} scope
 */
function deckCardMatchesScope(card, scope) {
  if (scope === "noMaterial") return !deckCardHasMaterial(card);
  if (scope.startsWith("letter:")) {
    const raw = scope.slice("letter:".length).toLowerCase();
    return deckCardRaw(card) === raw;
  }
  return true;
}

/**
 * @param {unknown[]} deck
 * @param {string} scope
 */
function listEligibleDeckCards(deck, scope) {
  const cards = Array.isArray(deck) ? deck : [];
  return cards.filter((card) => deckCardMatchesScope(card, scope));
}

/**
 * @param {unknown[]} eligible
 * @param {string} scope
 * @param {() => number} rng
 */
function pickDeckCardsForScope(eligible, scope, rng) {
  if (!eligible.length) return [];
  if (scope === "all" || scope === "noMaterial" || scope.startsWith("letter:")) {
    return [...eligible];
  }
  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (scope === "pct25") return shuffled.slice(0, Math.max(1, Math.ceil(shuffled.length * 0.25)));
  if (scope === "pct50") return shuffled.slice(0, Math.max(1, Math.ceil(shuffled.length * 0.5)));
  if (scope === "pct75") return shuffled.slice(0, Math.max(1, Math.ceil(shuffled.length * 0.75)));
  if (scope === "count1") return shuffled.slice(0, 1);
  if (scope === "count5") return shuffled.slice(0, Math.min(5, shuffled.length));
  if (scope === "count10") return shuffled.slice(0, Math.min(10, shuffled.length));
  return [...eligible];
}

/**
 * @param {Record<string, unknown>} card
 * @param {string} targetMaterialId
 */
export function applyDevMaterialToDeckCard(card, targetMaterialId) {
  card.materialScoreBonus = 0;
  card.materialMultBonus = 0;

  if (targetMaterialId === DEV_DECK_CONVERT_TARGET_PLAIN) {
    card.isWildcard = false;
    card.materialId = null;
    return;
  }

  if (targetMaterialId === WILDCARD_MATERIAL_ID) {
    card.isWildcard = true;
    card.materialId = WILDCARD_MATERIAL_ID;
    card.rarity = "common";
    return;
  }

  card.isWildcard = false;
  card.materialId = targetMaterialId;
  if (targetMaterialId === "water") card.materialScoreBonus = WATER_MATERIAL_SCORE_BONUS;
  if (targetMaterialId === "fire") card.materialMultBonus = FIRE_MATERIAL_MULT_BONUS;
}

/**
 * @param {Record<string, unknown>} card
 * @param {string | null} accessoryId null 表示清除配饰
 */
export function applyDevAccessoryToDeckCard(card, accessoryId) {
  writeEntityAccessory(card, accessoryId, "tile");
}

/**
 * @param {Record<string, unknown>} card
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 */
function buildTileSurfaceFromDeckCard(card, rarityLevelsByRarity) {
  const raw = deckCardRaw(card);
  const useWildcard = card.isWildcard === true;
  const rarity = useWildcard
    ? "common"
    : card.rarity != null && String(card.rarity).trim() !== ""
      ? String(card.rarity)
      : getRarityForLetter(raw || "a");
  const letter = useWildcard ? WILDCARD_TILE_LETTER : resolveLetterFromRaw(raw || "e");
  const normalizedAccessory = normalizeExclusiveTileAccessoryPair(card.accessoryId, card.treasureAccessoryId);
  return {
    letter,
    baseScore: getBaseScoreForRarity(rarity, rarityLevelsByRarity ?? null),
    rarity,
    letterMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
    tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
    materialScoreBonus: Math.max(0, Math.floor(Number(card.materialScoreBonus) || 0)),
    materialId: useWildcard ? WILDCARD_MATERIAL_ID : card.materialId != null ? String(card.materialId) : null,
    materialMultBonus: Number(card.materialMultBonus) || 0,
    accessoryId: normalizedAccessory.accessoryId,
    treasureAccessoryId: normalizedAccessory.treasureAccessoryId,
    isWildcard: useWildcard,
  };
}

/**
 * @param {object[][] | null | undefined} grid
 * @param {number} rows
 * @param {number} cols
 * @param {Record<string, unknown>} card
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 */
export function refreshGridTilesLinkedToDeckCard(grid, rows, cols, card, rarityLevelsByRarity) {
  if (!grid || !card) return 0;
  let updated = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tile = grid[row]?.[col];
      if (!tile || tile._deckCard !== card) continue;
      const id = tile.id;
      const selected = tile.selected;
      Object.assign(tile, buildTileSurfaceFromDeckCard(card, rarityLevelsByRarity));
      tile.id = id;
      if (selected !== undefined) tile.selected = selected;
      tile._deckCard = card;
      updated += 1;
    }
  }
  return updated;
}

/**
 * @param {{
 *   deck: unknown[],
 *   grid: object[][] | null | undefined,
 *   rows: number,
 *   cols: number,
 *   scope: string,
 *   target?: string,
 *   targetMaterialId?: string,
 *   rng?: () => number,
 *   rarityLevelsByRarity?: Record<string, number> | null,
 * }} params
 */
export function devConvertDeckTiles(params) {
  const {
    deck,
    grid,
    rows,
    cols,
    scope,
    target,
    targetMaterialId,
    rng = Math.random,
    rarityLevelsByRarity = null,
  } = params;
  const targetValue = target ?? targetMaterialId ?? DEV_DECK_CONVERT_TARGET_PLAIN;
  const accessoryMode = isDevDeckConvertAccessoryTarget(targetValue);
  const accessoryId = accessoryMode ? parseDevDeckConvertAccessoryTarget(targetValue) : null;
  const eligible = listEligibleDeckCards(deck, scope);
  const picked = pickDeckCardsForScope(eligible, scope, rng);
  let converted = 0;
  let gridUpdated = 0;
  for (const card of picked) {
    if (!card || typeof card !== "object") continue;
    const record = /** @type {Record<string, unknown>} */ (card);
    if (accessoryMode) {
      applyDevAccessoryToDeckCard(record, accessoryId);
    } else {
      applyDevMaterialToDeckCard(record, targetValue);
    }
    converted += 1;
    gridUpdated += refreshGridTilesLinkedToDeckCard(
      grid,
      rows,
      cols,
      record,
      rarityLevelsByRarity,
    );
  }
  return {
    converted,
    gridUpdated,
    eligible: eligible.length,
    accessoryMode,
    accessoryId,
    target: targetValue,
  };
}
