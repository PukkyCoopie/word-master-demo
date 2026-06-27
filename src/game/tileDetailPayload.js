import { normalizeExclusiveTileAccessoryPair } from "../accessories/accessoryState.js";
import { resolvePresentationBossTileDebuffed } from "./bossTileDebuff.js";
import { isWildcardMaterialTile } from "../composables/useScoring.js";

/**
 * @typedef {Object} TileDetailPayloadContext
 * @property {import('vue').Ref<Map<unknown, string>> | import('vue').ComputedRef<Map<unknown, string>>} gridTileLetterForRender
 * @property {import('vue').Ref<Map<unknown, string>> | import('vue').ComputedRef<Map<unknown, string>>} gridTileRarityForRender
 * @property {(tile: object) => { letter?: string, rarity?: string } | null | undefined} resolveWildcardInWordPresentation
 * @property {() => string} bossSlugForMechanics
 * @property {() => object} getBossTileDebuffContext
 * @property {(card: object) => string} deckCardRaw
 * @property {(raw: string) => string} resolveLetterFromRaw
 * @property {(letter: string) => string} getRarityForLetter
 */

/**
 * @param {object | null | undefined} tile
 * @param {TileDetailPayloadContext} ctx
 */
export function buildTileDetailPayloadFromTile(tile, ctx) {
  if (!tile) return null;
  const id = tile.id;
  let letter = tile.letter;
  let rarity = tile.rarity;
  const letterMap = ctx.gridTileLetterForRender.value;
  const rarityMap = ctx.gridTileRarityForRender.value;
  if (id != null) {
    if (letterMap.has(id)) letter = letterMap.get(id);
    if (rarityMap.has(id)) rarity = rarityMap.get(id);
  }
  if (isWildcardMaterialTile(tile) && String(letter ?? "").trim() === "?") {
    const inWord = ctx.resolveWildcardInWordPresentation(tile);
    if (inWord) {
      letter = inWord.letter;
      rarity = inWord.rarity ?? rarity;
    }
  }
  return {
    letter: letter ?? tile.letter,
    rarity: rarity ?? tile.rarity,
    tileScoreBonus: Math.max(0, Math.floor(Number(tile.tileScoreBonus) || 0)),
    tileMultBonus: Math.max(0, Math.round(Number(tile.letterMultBonus) || 0)),
    materialId: tile.materialId ?? null,
    materialScoreBonus: Math.max(0, Math.floor(Number(tile.materialScoreBonus) || 0)),
    materialMultBonus: Number(tile.materialMultBonus) || 0,
    accessoryId: tile.accessoryId ?? null,
    treasureAccessoryId: tile.treasureAccessoryId ?? null,
    foilOverlay: tile.foilOverlay === true,
    bossTileDebuffed: resolvePresentationBossTileDebuffed(
      { ...tile, letter: letter ?? tile.letter, rarity: rarity ?? tile.rarity },
      ctx.bossSlugForMechanics(),
      ctx.getBossTileDebuffContext(),
    ),
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} card
 * @param {TileDetailPayloadContext} ctx
 */
export function buildTileDetailPayloadFromDeckCard(card, ctx) {
  if (!card || typeof card !== "object") return null;
  const raw = ctx.deckCardRaw(card);
  const isWc = card.isWildcard === true;
  const letter = isWc ? "?" : ctx.resolveLetterFromRaw(raw || "e");
  const rarity =
    card.rarity != null && String(card.rarity).trim() !== ""
      ? String(card.rarity)
      : ctx.getRarityForLetter(isWc ? "e" : raw || "a");
  const accessoryFields = normalizeExclusiveTileAccessoryPair(card.accessoryId, card.treasureAccessoryId);
  return {
    letter,
    rarity: String(rarity || "common"),
    tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
    tileMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
    materialId: isWc ? "wildcard" : card.materialId ?? null,
    materialScoreBonus: Math.max(0, Math.floor(Number(card.materialScoreBonus) || 0)),
    materialMultBonus: Number(card.materialMultBonus) || 0,
    accessoryId: accessoryFields.accessoryId,
    treasureAccessoryId: accessoryFields.treasureAccessoryId,
    foilOverlay: false,
  };
}

/**
 * @param {number} slotIndex
 * @param {{
 *   getSelectedOrder: () => { row: number, col: number }[],
 *   getGrid: () => unknown[][],
 *   getWordSlotPresentations: () => object[],
 * } & TileDetailPayloadContext} ctx
 */
export function buildWordSlotTileDetailPayload(slotIndex, ctx) {
  const order = ctx.getSelectedOrder();
  if (slotIndex < 0 || slotIndex >= order.length) return null;
  const { row, col } = order[slotIndex];
  const tile = ctx.getGrid()[row]?.[col];
  const pres = ctx.getWordSlotPresentations()[slotIndex];
  if (!tile || !pres) return null;
  return buildTileDetailPayloadFromTile({ ...tile, ...pres }, ctx);
}
