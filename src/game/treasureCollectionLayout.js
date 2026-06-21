/** 宝藏全览弹窗固定高度（rpx） */
export const TREASURE_COLLECTION_PANEL_HEIGHT_RPX = 640;

/** 全览 grid 默认 / 最小格边长（rpx） */
export const TREASURE_COLLECTION_CELL_SIZE_RPX = 96;
export const TREASURE_COLLECTION_CELL_MIN_RPX = 52;

/** 全览 grid 间距（rpx） */
export const TREASURE_COLLECTION_GRID_GAP_RPX = 12;

/**
 * @param {number} areaWidthPx
 * @param {number} cellPx
 * @param {number} gapPx
 */
export function computeCollectionGridColumns(areaWidthPx, cellPx, gapPx) {
  const cell = Math.max(1, Number(cellPx) || 1);
  const gap = Math.max(0, Number(gapPx) || 0);
  const areaW = Math.max(1, Number(areaWidthPx) || 0);
  return Math.max(1, Math.floor((areaW + gap) / (cell + gap)));
}

/**
 * @param {number} slotCount
 * @param {number} cols
 * @param {number} cellPx
 * @param {number} gapPx
 */
export function computeCollectionGridExtents(slotCount, cols, cellPx, gapPx) {
  const n = Math.max(0, Math.floor(Number(slotCount) || 0));
  const c = Math.max(1, Math.floor(Number(cols) || 1));
  const cell = Math.max(1, Number(cellPx) || 1);
  const gap = Math.max(0, Number(gapPx) || 0);
  const rows = Math.max(1, Math.ceil(n / c));
  return {
    rows,
    heightPx: rows * cell + (rows - 1) * gap,
    widthPx: c * cell + (c - 1) * gap,
  };
}

/**
 * 在固定 grid 区域内，从 max 向 min 找最大可用格边长（无滚动）。
 *
 * @param {object} opts
 * @param {number} opts.areaWidthPx
 * @param {number} opts.areaHeightPx
 * @param {number} opts.slotCount
 * @param {number} opts.gapPx
 * @param {number} opts.maxCellPx
 * @param {number} opts.minCellPx
 */
export function computeCollectionGridCellPx({
  areaWidthPx,
  areaHeightPx,
  slotCount,
  gapPx,
  maxCellPx,
  minCellPx,
}) {
  const n = Math.max(0, Math.floor(Number(slotCount) || 0));
  const maxCell = Math.max(1, Number(maxCellPx) || 1);
  const minCell = Math.max(1, Math.min(Number(minCellPx) || 1, maxCell));
  const gap = Math.max(0, Number(gapPx) || 0);
  const areaW = Math.max(1, Number(areaWidthPx) || 0);
  const areaH = Math.max(1, Number(areaHeightPx) || 0);
  if (n <= 0) return maxCell;

  for (let cell = Math.ceil(maxCell); cell >= Math.floor(minCell); cell -= 1) {
    const cols = computeCollectionGridColumns(areaW, cell, gap);
    const { heightPx, widthPx } = computeCollectionGridExtents(n, cols, cell, gap);
    if (heightPx <= areaH && widthPx <= areaW) return cell;
  }
  return minCell;
}
