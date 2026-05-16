/**
 * 「仅留在棋盘上、未进入当手拼词槽」才参与记分的材质（棋盘光环类）。
 * 与 ice（入词字母才 ×2）分列，避免同一块材质既当拼词字母又当全棋盘增益双算。
 *
 * 新增同类材质时：
 * 1. 将 id 加入 `GRID_PRESENCE_SCORE_MATERIAL_IDS`
 * 2. 在 `GRID_PRESENCE_SCORE_MULT_BY_ID` 写入预览/结算乘数
 * 3. 在 `buildGridPresencePostLetterSteps` / `previewGridPresenceMultProduct` 中自动按格数与重播配饰次数叠乘（本模块负责排序与步列表）
 */

import { TILE_ACCESSORY_REWIND } from "./tileAccessories.js";

/** 与 GamePanel 下落 stagger 一致：最下一排先「入场」，用于棋盘光环类结算/预览排序 */
export const GRID_ENTRANCE_ROW_STAGGER = 0.045;
export const GRID_ENTRANCE_COL_STAGGER = 0.015;

/**
 * @param {number} row
 * @param {number} col
 * @param {number} rows
 * @param {number} cols
 * @param {number} [colMul=1]
 */
export function gridTileEntranceDelayKey(row, col, rows, cols, colMul = 1) {
  return (rows - 1 - row) * GRID_ENTRANCE_ROW_STAGGER + col * GRID_ENTRANCE_COL_STAGGER * colMul;
}

/**
 * 棋盘上某格光环单次结算的触发次数（与 GamePanel `getGridEffectTriggerCount` 一致）。
 * @param {{ accessoryId?: string | null } | null | undefined} tile
 */
export function getGridPresenceEffectTriggerCount(tile) {
  return tile?.accessoryId === TILE_ACCESSORY_REWIND ? 2 : 1;
}

/** @type {ReadonlySet<string>} */
export const GRID_PRESENCE_SCORE_MATERIAL_IDS = Object.freeze(new Set(["steel"]));

/** @type {Readonly<Record<string, number>>} */
export const GRID_PRESENCE_SCORE_MULT_BY_ID = Object.freeze({
  steel: 1.5,
});

/**
 * @param {Iterable<{ row?: number, col?: number } | null | undefined> | null | undefined} selectedEntries
 * @returns {Set<string>} `"row,col"` 键集
 */
export function gridSelectedPositionKeySet(selectedEntries) {
  const s = new Set();
  if (selectedEntries == null) return s;
  for (const e of selectedEntries) {
    const row = e?.row;
    const col = e?.col;
    if (Number.isFinite(row) && Number.isFinite(col)) s.add(`${row},${col}`);
  }
  return s;
}

/**
 * @param {unknown[][]} grid
 * @param {number} rows
 * @param {number} cols
 * @param {Set<string>} excludedPositionKeys `gridSelectedPositionKeySet` 的返回值
 * @returns {{ materialId: string, r: number, c: number, delay: number, tile: unknown }[]}
 */
function collectSortedGridPresenceItems(grid, rows, cols, excludedPositionKeys) {
  /** @type {{ materialId: string, r: number, c: number, delay: number, tile: unknown }[]} */
  const items = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excludedPositionKeys.has(`${r},${c}`)) continue;
      const t = grid[r]?.[c];
      const mid = t?.materialId;
      if (typeof mid !== "string" || !GRID_PRESENCE_SCORE_MATERIAL_IDS.has(mid)) continue;
      const factor = Number(GRID_PRESENCE_SCORE_MULT_BY_ID[mid]);
      if (!Number.isFinite(factor) || factor <= 0) continue;
      items.push({
        materialId: mid,
        r,
        c,
        delay: gridTileEntranceDelayKey(r, c, rows, cols),
        tile: t,
      });
    }
  }
  items.sort((a, b) => {
    if (a.delay !== b.delay) return a.delay - b.delay;
    if (a.r !== b.r) return a.r - b.r;
    return a.c - b.c;
  });
  return items;
}

/**
 * 公式区预览：每个符合条件的棋盘光环格各叠一层乘数（顺序与结算字后步一致）；同格重播配饰再 ×1 次。
 * @param {unknown[][]} grid
 * @param {number} rows
 * @param {number} cols
 * @param {Set<string>} excludedPositionKeys
 * @param {(tile: unknown) => number} [getGridEffectTriggerCount]
 */
export function previewGridPresenceMultProduct(
  grid,
  rows,
  cols,
  excludedPositionKeys,
  getGridEffectTriggerCount = getGridPresenceEffectTriggerCount,
) {
  let mul = 1;
  const items = collectSortedGridPresenceItems(grid, rows, cols, excludedPositionKeys);
  for (const it of items) {
    const factor = Number(GRID_PRESENCE_SCORE_MULT_BY_ID[it.materialId]);
    if (!Number.isFinite(factor) || factor <= 0) continue;
    const n = Math.max(1, Math.floor(Number(getGridEffectTriggerCount(it.tile)) || 0));
    for (let k = 0; k < n; k++) mul *= factor;
  }
  return mul;
}

/**
 * 单次提交：棋盘光环类字后倍率乘法步（与 `computeWordScoreDetailedForSubmit` 管线一致）。
 * @param {unknown[][]} grid
 * @param {number} rows
 * @param {number} cols
 * @param {Set<string>} excludedPositionKeys
 * @param {(tile: unknown) => number} [getGridEffectTriggerCount]
 * @returns {{ treasureId: null, slotIndex: number, multMul: number, scoreFxGridTileIndex: number, accessoryTriggered: boolean }[]}
 */
export function buildGridPresencePostLetterSteps(
  grid,
  rows,
  cols,
  excludedPositionKeys,
  getGridEffectTriggerCount = getGridPresenceEffectTriggerCount,
) {
  const items = collectSortedGridPresenceItems(grid, rows, cols, excludedPositionKeys);
  /** @type {{ treasureId: null, slotIndex: number, multMul: number, scoreFxGridTileIndex: number, accessoryTriggered: boolean }[]} */
  const steps = [];
  for (const it of items) {
    const factor = Number(GRID_PRESENCE_SCORE_MULT_BY_ID[it.materialId]);
    if (!Number.isFinite(factor) || factor <= 0) continue;
    const n = Math.max(1, Math.floor(Number(getGridEffectTriggerCount(it.tile)) || 0));
    const idx = it.r * cols + it.c;
    for (let k = 0; k < n; k++) {
      steps.push({
        treasureId: null,
        slotIndex: -1,
        multMul: factor,
        scoreFxGridTileIndex: idx,
        accessoryTriggered: k > 0,
      });
    }
  }
  return steps;
}
