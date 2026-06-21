import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { SHOP_TILE_PACK_MATERIAL_IDS } from "../shop/shopPackEconomy.js";

const WILDCARD_MATERIAL_ID = "wildcard";
const WILDCARD_TILE_LETTER = "?";
const WATER_MATERIAL_SCORE_BONUS = 30;
const FIRE_MATERIAL_MULT_BONUS = 5;

/**
 * @param {Record<string, unknown> | null | undefined} tile
 */
function gridTileHasMaterial(tile) {
  if (!tile || typeof tile !== "object") return false;
  if (tile.isWildcard === true) return true;
  return String(tile.materialId ?? "").trim() !== "";
}

/**
 * @param {Record<string, unknown>} tile
 * @param {string} materialId
 */
export function applyDevGridMaterial(tile, materialId) {
  tile.materialScoreBonus = 0;
  tile.materialMultBonus = 0;
  const card = tile._deckCard;
  if (card && typeof card === "object") {
    card.materialScoreBonus = 0;
    card.materialMultBonus = 0;
  }

  if (materialId === WILDCARD_MATERIAL_ID) {
    tile.isWildcard = true;
    tile.materialId = WILDCARD_MATERIAL_ID;
    tile.letter = WILDCARD_TILE_LETTER;
    tile.rarity = "common";
    syncTileStateToDeckCard(tile);
    return;
  }

  tile.isWildcard = false;
  tile.materialId = materialId;
  if (materialId === "water") tile.materialScoreBonus = WATER_MATERIAL_SCORE_BONUS;
  if (materialId === "fire") tile.materialMultBonus = FIRE_MATERIAL_MULT_BONUS;
  syncTileStateToDeckCard(tile);
}

/**
 * 为棋盘上尚无材质的字母格各随机掷一种材质（含万能块）。
 * @param {object[][] | null | undefined} grid
 * @param {number} rows
 * @param {number} cols
 * @param {readonly string[]} [materialIds]
 * @param {() => number} [rng]
 */
export function applyRandomMaterialsToGridTilesWithoutMaterial(
  grid,
  rows,
  cols,
  materialIds = SHOP_TILE_PACK_MATERIAL_IDS,
  rng = Math.random,
) {
  const ids = [...(materialIds ?? SHOP_TILE_PACK_MATERIAL_IDS)].filter(
    (id) => String(id ?? "").trim() !== "",
  );
  if (!grid || !ids.length) return { updated: 0, tiles: [] };

  /** @type {{ row: number, col: number, letter: string, materialId: string }[]} */
  const tiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tile = grid[row]?.[col];
      if (!tile?.letter || tile.bossGridBlocked) continue;
      if (gridTileHasMaterial(tile)) continue;
      const materialId = ids[Math.floor(rng() * ids.length)];
      applyDevGridMaterial(tile, materialId);
      tiles.push({
        row,
        col,
        letter: String(tile.letter ?? ""),
        materialId,
      });
    }
  }
  return { updated: tiles.length, tiles };
}
