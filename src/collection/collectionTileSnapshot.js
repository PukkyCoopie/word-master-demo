import { deckCardRaw } from "../game/deckCardSync.js";
import { serializeOwnedTreasureSlots } from "../treasures/ownedTreasureSlot.js";

/**
 * @param {unknown} tile
 * @returns {import('./collectionTypes.js').CollectionSubmitTileSnapshot | null}
 */
export function snapshotSubmitTile(tile) {
  if (!tile || typeof tile !== "object") return null;
  const t = /** @type {Record<string, unknown>} */ (tile);
  const letter = String(t.letter ?? "").trim();
  if (!letter) return null;

  const deckCard = t._deckCard;
  let naturalLetter = "";
  let vowelDisplayShift = 0;
  if (deckCard && typeof deckCard === "object") {
    naturalLetter = deckCardRaw(deckCard);
    vowelDisplayShift = Math.sign(Number(/** @type {{ vowelDisplayShift?: unknown }} */ (deckCard).vowelDisplayShift) || 0);
  }

  /** @type {import('./collectionTypes.js').CollectionSubmitTileSnapshot} */
  const out = {
    letter,
    rarity: String(t.rarity ?? "common"),
    materialId: t.materialId != null ? String(t.materialId) : null,
    isWildcard: t.isWildcard === true,
    tileScoreBonus: Math.max(0, Math.floor(Number(t.tileScoreBonus) || 0)),
    letterMultBonus: Number(t.letterMultBonus) || 0,
    materialScoreBonus: Math.max(0, Math.floor(Number(t.materialScoreBonus) || 0)),
    materialMultBonus: Number(t.materialMultBonus) || 0,
    accessoryId: t.accessoryId != null ? String(t.accessoryId) : null,
    treasureAccessoryId: t.treasureAccessoryId != null ? String(t.treasureAccessoryId) : null,
  };

  if (naturalLetter && naturalLetter !== letter.toLowerCase().slice(0, 1)) {
    out.naturalLetter = naturalLetter;
  }
  if (vowelDisplayShift !== 0) out.vowelDisplayShift = vowelDisplayShift;

  const ghostPrev = t.vowelGhostPrev != null ? String(t.vowelGhostPrev).trim() : "";
  const ghostNext = t.vowelGhostNext != null ? String(t.vowelGhostNext).trim() : "";
  if (ghostPrev) out.vowelGhostPrev = ghostPrev;
  if (ghostNext) out.vowelGhostNext = ghostNext;

  return out;
}

/**
 * @param {unknown[]} tiles
 * @returns {import('./collectionTypes.js').CollectionSubmitTileSnapshot[]}
 */
export function snapshotSubmitTiles(tiles) {
  if (!Array.isArray(tiles)) return [];
  return tiles.map(snapshotSubmitTile).filter(Boolean);
}

/**
 * @param {unknown[]} ownedTreasureSlots
 * @returns {import('../save/runSavePayload.js').SerializedOwnedTreasureSlot[]}
 */
export function snapshotOwnedTreasuresForCollection(ownedTreasureSlots) {
  return serializeOwnedTreasureSlots(ownedTreasureSlots ?? []).filter(Boolean);
}
