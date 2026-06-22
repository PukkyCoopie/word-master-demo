import {
  TREASURE_BAR_SLOT_GAP_RPX,
  TREASURE_BAR_STACK_FILL_THRESHOLD,
} from "./treasureBarLayout.js";

/** 宝藏全览弹窗固定高度（rpx，原 640 的 150%） */
export const TREASURE_COLLECTION_PANEL_HEIGHT_RPX = 960;

/** 与 `.game-container` 一致的内边距（rpx） */
export const GAME_CONTAINER_PAD_RPX = 14;

/** 局内逻辑画布宽（rpx），与 `css/game.css` `--logic-w` 一致 */
export const GAME_LOGIC_WIDTH_RPX = 750;

/**
 * 全览弹窗固定宽度（rpx）：game-container 去掉左右 padding 后的内容区宽。
 * 750 - 14×2 = 722
 */
export const TREASURE_COLLECTION_PANEL_WIDTH_RPX =
  GAME_LOGIC_WIDTH_RPX - GAME_CONTAINER_PAD_RPX * 2;

/** `.treasure-slots-ctn` 水平 padding 单边（rpx） */
export const TREASURE_BAR_CTN_HORIZONTAL_PAD_RPX = 8;

/** 全览 grid 默认格边长（rpx） */
export const TREASURE_COLLECTION_CELL_SIZE_RPX = 96;

/**
 * 宝藏栏 9 槽非叠放均分时的参考格边长（rpx，设计稿写死）。
 * floor((734 - 8×8) / 9) = 74
 */
const TREASURE_BAR_REFERENCE_CELL_MIN_RPX = Math.floor(
  (GAME_LOGIC_WIDTH_RPX
    - TREASURE_BAR_CTN_HORIZONTAL_PAD_RPX * 2
    - (TREASURE_BAR_STACK_FILL_THRESHOLD - 1) * TREASURE_BAR_SLOT_GAP_RPX)
  / TREASURE_BAR_STACK_FILL_THRESHOLD,
);

/**
 * 全览 grid 最小格边长（rpx）：栏内参考下限 × 1.25，取整（74×1.25→93）。
 * 保证全览格不比栏内更小，且较参考值放大 25%。
 */
export const TREASURE_COLLECTION_CELL_MIN_RPX = Math.round(
  TREASURE_BAR_REFERENCE_CELL_MIN_RPX * 1.25,
);

/** 全览 grid 间距（rpx） */
export const TREASURE_COLLECTION_GRID_GAP_RPX = 12;

/** 右侧自定义滚动条：track 宽 + 与内容区间距（rpx）；布局测量始终预留，避免显隐撑宽抖动 */
export const TREASURE_COLLECTION_SCROLLBAR_TRACK_RPX = 22;
export const TREASURE_COLLECTION_SCROLLBAR_GAP_RPX = 10;
export const TREASURE_COLLECTION_SCROLLBAR_GUTTER_RPX =
  TREASURE_COLLECTION_SCROLLBAR_TRACK_RPX + TREASURE_COLLECTION_SCROLLBAR_GAP_RPX;

/** 滚动条 thumb 最小高度（rpx），保证握把标记可点 */
export const TREASURE_COLLECTION_SCROLLBAR_MIN_THUMB_RPX = 44;

/** track 与 thumb 四边等距间隙（rpx），保持同心圆角 pill */
export const TREASURE_COLLECTION_SCROLLBAR_THUMB_INSET_RPX = 3;

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
 * 按槽位数与可用宽估算 grid 内容区高度（px）；拖动预览时槽数不变，用于锁定高度。
 *
 * @param {object} opts
 * @param {number} opts.areaWidthPx
 * @param {number} opts.slotCount
 * @param {number} opts.cellPx
 * @param {number} opts.gapPx
 */
export function computeCollectionGridContentHeightPx({
  areaWidthPx,
  slotCount,
  cellPx,
  gapPx,
}) {
  const cols = computeCollectionGridColumns(areaWidthPx, cellPx, gapPx);
  return computeCollectionGridExtents(slotCount, cols, cellPx, gapPx).heightPx;
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

/**
 * 全览 grid 布局结果：格边长 + 在最小格下是否仍需纵向滚动。
 *
 * @param {Parameters<typeof computeCollectionGridCellPx>[0]} params
 */
export function measureCollectionGridLayout(params) {
  const cellPx = computeCollectionGridCellPx(params);
  const areaW = Math.max(1, Number(params.areaWidthPx) || 0);
  const areaH = Math.max(1, Number(params.areaHeightPx) || 0);
  const gapPx = Math.max(0, Number(params.gapPx) || 0);
  const slotCount = Math.max(0, Math.floor(Number(params.slotCount) || 0));
  const cols = computeCollectionGridColumns(areaW, cellPx, gapPx);
  const { heightPx, widthPx } = computeCollectionGridExtents(slotCount, cols, cellPx, gapPx);
  return {
    cellPx,
    cols,
    contentHeightPx: heightPx,
    contentWidthPx: widthPx,
    needsScroll: heightPx > areaH + 0.5,
  };
}
