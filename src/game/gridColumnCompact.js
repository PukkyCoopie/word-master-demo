/**
 * 建盘/读档后将各列字母块靠底叠放，顶部 null 占位（与 applySubmitRefill 重力一致）。
 * @param {unknown[][]} rows
 * @param {{ rows?: number, cols?: number, manacle?: boolean }} [opts]
 */
export function compactGridColumnsToBottom(rows, opts = {}) {
  const ROWS = Math.max(1, Math.floor(Number(opts.rows) || 4));
  const COLS = Math.max(1, Math.floor(Number(opts.cols) || 4));
  const manacle = opts.manacle === true;
  const topRow = manacle ? 1 : 0;
  const playableRows = ROWS - topRow;

  for (let col = 0; col < COLS; col++) {
    /** @type {unknown[]} */
    const columnTiles = [];
    for (let r = topRow; r < ROWS; r++) {
      const cell = rows[r][col];
      if (cell != null && cell.letter && String(cell.letter).trim() !== "") {
        columnTiles.push(cell);
      }
    }
    const emptyCount = playableRows - columnTiles.length;
    const newPlayable = [];
    for (let i = 0; i < emptyCount; i++) newPlayable.push(null);
    newPlayable.push(...columnTiles);

    if (manacle) {
      for (let r = topRow; r < ROWS; r++) {
        rows[r][col] = newPlayable[r - topRow];
      }
    } else {
      for (let r = 0; r < ROWS; r++) {
        rows[r][col] = newPlayable[r];
      }
    }
  }
  return rows;
}
