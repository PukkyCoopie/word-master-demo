/**
 * 剥离字母块「增强」：配饰与角标分/倍率（不含材质类型、稀有度、万能）。
 */
import { entityHasAccessory } from "../accessories/accessoryState.js";

/** @param {object | null | undefined} tileOrCard */
export function stripEnhancementsFromTileOrDeckCard(tileOrCard) {
  const t = tileOrCard;
  if (!t || typeof t !== "object") return;
  t.accessoryId = null;
  t.treasureAccessoryId = null;
  if ("tileScoreBonus" in t) t.tileScoreBonus = 0;
  if ("letterMultBonus" in t) t.letterMultBonus = 0;
  if ("materialScoreBonus" in t) t.materialScoreBonus = 0;
  if ("materialMultBonus" in t) t.materialMultBonus = 0;
}

/** @param {object | null | undefined} tile */
export function tileHasScoringEnhancement(tile) {
  const t = tile;
  if (!t || typeof t !== "object") return false;
  if (entityHasAccessory(t)) return true;
  if (Math.floor(Number(t.tileScoreBonus) || 0) !== 0) return true;
  if (Math.floor(Number(t.letterMultBonus) || 0) !== 0) return true;
  if (Math.floor(Number(t.materialScoreBonus) || 0) !== 0) return true;
  if (Math.floor(Number(t.materialMultBonus) || 0) !== 0) return true;
  return false;
}

/** @param {readonly object[] | null | undefined} tiles */
export function countScoringEnhancementsInTiles(tiles) {
  if (!Array.isArray(tiles)) return 0;
  let n = 0;
  for (const t of tiles) {
    if (tileHasScoringEnhancement(t)) n += 1;
  }
  return n;
}
