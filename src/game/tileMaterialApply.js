/**
 * 棋盘格材质写入（保留角标增益，写回牌张）。
 */
import { syncTileStateToDeckCard } from "./deckCardSync.js";
import {
  snapshotMaxIntrinsicGainsFromTile,
  applyIntrinsicGainsToTileAndLinkedCard,
} from "./tileIntrinsicGains.js";

const WATER_MATERIAL_SCORE_BONUS = 30;
const FIRE_MATERIAL_MULT_BONUS = 5;

/**
 * @param {Record<string, unknown>} tile
 */
function clearMaterialEconomy(tile) {
  tile.materialId = null;
  tile.materialScoreBonus = 0;
  tile.materialMultBonus = 0;
  const c = tile._deckCard;
  if (c && typeof c === "object") {
    c.materialScoreBonus = 0;
    c.materialMultBonus = 0;
  }
}

/**
 * @param {Record<string, unknown>} tile
 * @param {string} materialId
 */
export function applyPlainMaterialToTile(tile, materialId) {
  const gains = snapshotMaxIntrinsicGainsFromTile(tile);
  clearMaterialEconomy(tile);
  tile.materialId = materialId;
  if (materialId === "water") tile.materialScoreBonus = WATER_MATERIAL_SCORE_BONUS;
  if (materialId === "fire") tile.materialMultBonus = FIRE_MATERIAL_MULT_BONUS;
  if (materialId !== "wildcard") tile.isWildcard = false;
  applyIntrinsicGainsToTileAndLinkedCard(tile, gains);
  syncTileStateToDeckCard(tile);
}

/**
 * @param {Record<string, unknown>} tile
 */
export function applyFireMaterialToTile(tile) {
  applyPlainMaterialToTile(tile, "fire");
}
