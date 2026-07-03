import { animateGridTileMaterialChangeAtCell } from "./spellTileAppearanceAnim.js";

export { findWordSlotIndexForGridCell } from "./fireworkIgniteTargets.js";

const IGNITE_BUBBLE_Z_INDEX = 380;

/**
 * @typedef {Object} GridTileIgniteFxDeps
 * @property {(row: number, col: number) => HTMLElement | undefined} getGridTileEl
 * @property {(row: number, col: number) => HTMLElement | null | undefined} [getWordSlotShrinkPopElForGridCell]
 * @property {() => void} touchGrid
 * @property {(anchor: unknown, text: string, kind: string, speed?: number, bubbleZIndex?: number) => HTMLElement | null} showScoreBubble
 * @property {(bubble: HTMLElement | null | undefined, speed?: number) => void} scheduleSmallPlusBubbleOutro
 */

/** @param {HTMLElement | null | undefined} slotWrapper */
export function resolveWordSlotShrinkPopEl(slotWrapper) {
  if (!(slotWrapper instanceof HTMLElement)) return null;
  const inner = slotWrapper.querySelector(".word-slot-content");
  return inner instanceof HTMLElement ? inner : slotWrapper;
}

/** @param {GridTileIgniteFxDeps} deps @param {number} row @param {number} col @param {number} [sp=1] */
export function showIgniteBubbleAtGridCell(deps, row, col, sp = 1) {
  const tileEl = deps.getGridTileEl(row, col);
  let anchor = tileEl;
  if (tileEl instanceof HTMLElement) {
    const cellEl = tileEl.closest(".letter-grid-cell");
    if (cellEl instanceof HTMLElement) anchor = cellEl;
  }
  if (!(anchor instanceof HTMLElement)) return;
  const bubble = deps.showScoreBubble(anchor, "点燃", "ignite", sp, IGNITE_BUBBLE_Z_INDEX);
  if (bubble) deps.scheduleSmallPlusBubbleOutro(bubble, sp);
}

/**
 * 单格缩小 → `onMidApply`（换材质等）→ 回弹并弹出「点燃」气泡。
 * 若该格字母同时在 word 中，词槽对应字母同步同一套缩放回弹。
 * @param {GridTileIgniteFxDeps} deps
 * @param {number} row
 * @param {number} col
 * @param {() => void} [onMidApply]
 * @param {number} [sp=1]
 */
export async function runGridTileIgniteAtCell(deps, row, col, onMidApply, sp = 1) {
  const wordSlotEl = deps.getWordSlotShrinkPopElForGridCell?.(row, col);
  await animateGridTileMaterialChangeAtCell({
    row,
    col,
    getTileEl: deps.getGridTileEl,
    touchGrid: deps.touchGrid,
    delay: 0,
    onMidApply,
    companionEls: wordSlotEl ? [wordSlotEl] : [],
    onPopStart: () => {
      showIgniteBubbleAtGridCell(deps, row, col, sp);
    },
  });
}

/**
 * 单格缩小 → `onMidApply`（换材质等）→ 回弹；无气泡（法术/蜂蜜等材质切换）。
 * @param {GridTileIgniteFxDeps} deps
 * @param {number} row
 * @param {number} col
 * @param {() => void} [onMidApply]
 */
export async function runGridTileMaterialChangeAtCell(deps, row, col, onMidApply) {
  const wordSlotEl = deps.getWordSlotShrinkPopElForGridCell?.(row, col);
  await animateGridTileMaterialChangeAtCell({
    row,
    col,
    getTileEl: deps.getGridTileEl,
    touchGrid: deps.touchGrid,
    delay: 0,
    onMidApply,
    companionEls: wordSlotEl ? [wordSlotEl] : [],
  });
}
