import { offerFlyOriginRectFromEl, resolveOfferFlyOriginEl } from "../game/offerFlyOrigin.js";
import { readTreasureAccessoryIds } from "../accessories/accessoryState.js";
import { ACCESSORY_CATALOG } from "../accessories/accessoryCatalog.js";
import { TILE_MATERIAL_CONCEPT_BY_ID } from "../game/gameConceptCopy.js";
import { buildTreasureShopRowFromDef } from "../shop/shopOfferRowBuilders.js";
import { buildSpellOfferPreviewFromId } from "../spells/spellReplayUi.js";
import { buildCollectionUpgradePreview } from "./collectionUpgradeCatalog.js";
import { getTreasureDef } from "../treasures/treasureRegistry.js";
import { buildOwnedTreasureSlot } from "../treasures/ownedTreasureSlot.js";
import { normalizeStoredTileLetter } from "../settings/letterQ.js";

/** @type {() => number} */
let previewOfferInstanceSeq = 0;

/**
 * 飞入详情起点：与 ShopPanel.shopOfferFlyOriginEl 一致（icon 框，非整列价签）。
 * @param {HTMLElement | null | undefined} root
 * @returns {HTMLElement | null}
 */
export function collectionFlyOriginEl(root) {
  return resolveOfferFlyOriginEl(root);
}

/**
 * @param {HTMLElement | null | undefined} el
 * @returns {{ left: number, top: number, width: number, height: number } | null}
 */
export function collectionFlyOriginRectFromEl(el) {
  return offerFlyOriginRectFromEl(el);
}

/**
 * @param {string} treasureId
 */
export function buildCollectionTreasurePreview(treasureId) {
  const def = getTreasureDef(String(treasureId ?? "").trim());
  if (!def) return null;
  return buildTreasureShopRowFromDef(() => ++previewOfferInstanceSeq, def, () => 0.5, 1, null);
}

/**
 * @param {import('../save/runSavePayload.js').SerializedOwnedTreasureSlot | Record<string, unknown>} saved
 */
export function buildCollectionOwnedTreasurePreview(saved) {
  const slot = buildOwnedTreasureSlot(saved);
  if (!slot) return null;
  const accessoryIds = readTreasureAccessoryIds(slot);
  return {
    kind: "offer",
    offerType: "treasure",
    offerInstanceId: ++previewOfferInstanceSeq,
    treasureId: slot.treasureId,
    price: slot.price,
    rarity: slot.rarity,
    name: slot.name,
    emoji: slot.emoji,
    description: slot.description,
    treasureAccessoryIds: accessoryIds,
    treasureAccessoryId: accessoryIds[0] ?? null,
    hourglassStagesElapsed: slot.hourglassStagesElapsed,
    treasureAccessoryExpired: slot.treasureAccessoryExpired === true,
  };
}

/**
 * @param {string} spellId
 */
export function buildCollectionSpellPreview(spellId) {
  return buildSpellOfferPreviewFromId(spellId);
}

export { buildCollectionUpgradePreview };

/**
 * @param {string} materialId
 */
export function buildMaterialTileDetailPayload(materialId) {
  const id = String(materialId ?? "").trim();
  if (!id || !TILE_MATERIAL_CONCEPT_BY_ID[id]) return null;
  const isWildcard = id === "wildcard";
  return {
    letter: isWildcard ? "?" : "·",
    rarity: "common",
    materialId: id,
    accessoryId: null,
    treasureAccessoryId: null,
    tileScoreBonus: 0,
    tileMultBonus: 0,
    hideRarityGem: true,
    hideLetter: !isWildcard,
  };
}

/**
 * @param {string} accessoryId
 */
export function buildAccessoryTileDetailPayload(accessoryId) {
  const id = String(accessoryId ?? "").trim();
  const def = ACCESSORY_CATALOG[id];
  if (!def) return null;
  const isTreasureScope = def.legacyStorage === "treasure_field";
  return {
    letter: "E",
    rarity: "common",
    materialId: null,
    accessoryId: isTreasureScope ? null : id,
    treasureAccessoryId: isTreasureScope ? id : null,
    tileScoreBonus: 0,
    tileMultBonus: 0,
    hideRarityGem: true,
  };
}

export function buildTileDetailPayloadFromCollectionSnapshot(tile) {
  if (!tile || typeof tile !== "object") return null;
  const isWc = tile.isWildcard === true;
  const rawLetter = String(tile.letter ?? "").trim();
  const normalizeLetter = (s) => {
    const t = String(s ?? "").trim();
    if (!t) return "";
    const lower = t.toLowerCase();
    if (lower === "q" || lower === "qu") return normalizeStoredTileLetter(t);
    return t.toUpperCase();
  };
  const letter = isWc
    ? rawLetter && rawLetter !== "?"
      ? normalizeLetter(rawLetter)
      : "?"
    : rawLetter
      ? normalizeLetter(rawLetter)
      : "E";
  return {
    letter,
    rarity: String(tile.rarity ?? "common"),
    tileScoreBonus: Math.max(0, Math.floor(Number(tile.tileScoreBonus) || 0)),
    tileMultBonus: Math.max(0, Math.round(Number(tile.letterMultBonus) || 0)),
    materialId: isWc ? "wildcard" : tile.materialId ?? null,
    materialScoreBonus: Math.max(0, Math.floor(Number(tile.materialScoreBonus) || 0)),
    materialMultBonus: Number(tile.materialMultBonus) || 0,
    accessoryId: tile.accessoryId ?? null,
    treasureAccessoryId: tile.treasureAccessoryId ?? null,
    foilOverlay: false,
  };
}
