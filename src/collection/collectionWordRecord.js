import {
  snapshotOwnedTreasuresForCollection,
  snapshotSubmitTiles,
} from "./collectionTileSnapshot.js";

/**
 * @param {{
 *   word: string,
 *   score: number,
 *   length: number,
 *   tiles: unknown[],
 *   ownedTreasures: unknown[],
 * }} payload
 * @returns {import('./collectionTypes.js').CollectionWordRecord}
 */
export function buildSubmitWordRecord({ word, score, length, tiles, ownedTreasures }) {
  return {
    word: String(word ?? "").trim(),
    score: Math.max(0, Math.floor(Number(score) || 0)),
    length: Math.max(0, Math.floor(Number(length) || 0)),
    recordedAt: Date.now(),
    tiles: snapshotSubmitTiles(tiles),
    ownedTreasures: snapshotOwnedTreasuresForCollection(ownedTreasures),
  };
}
