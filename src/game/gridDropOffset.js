/** @param {number} row 完整棋盘行索引（0 起） */
export function gridIntroDropOffsetRows(row) {
  return row + 2.2;
}

/**
 * @param {number} row
 * @param {boolean} hasEmptyAbove 该列当前格上方是否存在可落空的格
 * @param {number} [rows=4]
 */
export function gridRefillNewTileDropOffsetRows(row, hasEmptyAbove, rows = 4) {
  if (hasEmptyAbove) return rows + row + 2;
  return row + 2;
}

/** @param {number} dropOffsetRows @param {number} row */
export function isGridDropFromAboveGrid(dropOffsetRows, row) {
  return dropOffsetRows > row + 2;
}
