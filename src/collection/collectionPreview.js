import { readTreasureAccessoryIds } from "../accessories/accessoryState.js";
import { buildTreasureShopRowFromDef } from "../shop/shopOfferRowBuilders.js";
import { buildSpellOfferPreviewFromId } from "../spells/spellReplayUi.js";
import { buildCollectionUpgradePreview } from "./collectionUpgradeCatalog.js";
import { getTreasureDef } from "../treasures/treasureRegistry.js";
import { buildOwnedTreasureSlot } from "../treasures/ownedTreasureSlot.js";

/** @type {() => number} */
let previewOfferInstanceSeq = 0;

/**
 * 飞入详情起点：与 ShopPanel.shopOfferFlyOriginEl 一致（icon 框，非整列价签）。
 * @param {HTMLElement | null | undefined} root
 * @returns {HTMLElement | null}
 */
export function collectionFlyOriginEl(root) {
  if (!root || !(root instanceof HTMLElement)) return null;
  return (
    root.querySelector(".shop-shelf-letter-tile") ??
    root.querySelector(".shop-treasure-frame") ??
    root.querySelector(".voucher-stamp-stack__front .voucher-stamp__frame") ??
    root.querySelector(".voucher-stamp-stack .voucher-stamp__frame") ??
    root.querySelector(".voucher-stamp__frame") ??
    root.querySelector(".treasure-slot") ??
    root
  );
}

/**
 * @param {HTMLElement | null | undefined} el
 * @returns {{ left: number, top: number, width: number, height: number } | null}
 */
export function collectionFlyOriginRectFromEl(el) {
  const node = collectionFlyOriginEl(el instanceof HTMLElement ? el : null);
  if (!node || typeof node.getBoundingClientRect !== "function") return null;
  const r = node.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return { left: r.left, top: r.top, width: r.width, height: r.height };
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
 * @param {import('./collectionTypes.js').CollectionSubmitTileSnapshot} tile
 */
export function buildTileDetailPayloadFromCollectionSnapshot(tile) {
  if (!tile || typeof tile !== "object") return null;
  const isWc = tile.isWildcard === true;
  const letter = isWc ? "?" : String(tile.letter ?? "e").toUpperCase();
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
