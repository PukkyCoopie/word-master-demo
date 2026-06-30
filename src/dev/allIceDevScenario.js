import { syncTileStateToDeckCard } from "../game/deckCardSync.js";

export const ALL_ICE_DEV_QUERY = "allIce";

/**
 * @param {() => number} [rng]
 */
export function isAllIceDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? "").get("dev") === ALL_ICE_DEV_QUERY;
}

/**
 * @param {Record<string, unknown>} tile
 */
function applyIceToGridTile(tile) {
  tile.isWildcard = false;
  tile.materialId = "ice";
  tile.materialScoreBonus = 0;
  tile.materialMultBonus = 0;
  syncTileStateToDeckCard(tile);
}

/**
 * 开局棋盘：所有有字母格改为碎冰块。
 * @param {object[][] | null | undefined} grid
 * @param {number} rows
 * @param {number} cols
 */
export function applyIceMaterialToAllGridTiles(grid, rows, cols) {
  if (!grid) return { updated: 0 };
  let updated = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tile = grid[row]?.[col];
      if (!tile?.letter || tile.bossGridBlocked) continue;
      applyIceToGridTile(tile);
      updated += 1;
    }
  }
  return { updated };
}

/**
 * 字母库 multiset / 抽牌堆：非万能牌张写入碎冰材质（补牌后仍为碎冰）。
 * @param {readonly unknown[] | null | undefined} cards
 */
export function applyIceMaterialToAllDeckCards(cards) {
  if (!Array.isArray(cards)) return { updated: 0 };
  let updated = 0;
  for (const card of cards) {
    if (!card || typeof card !== "object") continue;
    if (/** @type {{ isWildcard?: boolean }} */ (card).isWildcard === true) continue;
    /** @type {{ materialId?: string | null, materialScoreBonus?: number, materialMultBonus?: number }} */ (
      card
    ).materialId = "ice";
    card.materialScoreBonus = 0;
    card.materialMultBonus = 0;
    updated += 1;
  }
  return { updated };
}
