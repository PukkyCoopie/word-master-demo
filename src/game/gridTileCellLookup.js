/**
 * 按 tile.id 在棋盘逻辑格位中查找当前坐标（下落/补牌后应用）。
 * @param {object[][] | null | undefined} grid
 * @param {string} tileId
 * @param {number} rows
 * @param {number} cols
 * @returns {{ row: number, col: number } | null}
 */
export function findGridCellByTileId(grid, tileId, rows, cols) {
  const id = String(tileId ?? "").trim();
  if (!id || !grid) return null;
  const R = Math.max(0, Math.floor(Number(rows)) || 0);
  const C = Math.max(0, Math.floor(Number(cols)) || 0);
  for (let r = 0; r < R; r++) {
    for (let c = 0; c < C; c++) {
      const t = grid[r]?.[c];
      if (t && String(t.id) === id) return { row: r, col: c };
    }
  }
  return null;
}
