/**
 * 「仅留在棋盘上、未进入当手拼词槽」才参与记分的材质（棋盘光环类）。
 * 与 ice（入词字母才 ×2）分列，避免同一块材质既当拼词字母又当全棋盘增益双算。
 *
 * 新增同类材质时：
 * 1. 将 id 加入 `GRID_PRESENCE_SCORE_MATERIAL_IDS`
 * 2. 在 `GRID_PRESENCE_SCORE_MULT_BY_ID` 写入预览/结算乘数
 * 3. 若提交管线需动效锚点等，在 `treasureScoring` 的 `computeWordScoreDetailedForSubmit` 中按 id 扩展（本模块只负责「哪些格算在盘上」）
 */

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
 * @param {string} materialId
 * @param {Set<string>} excludedPositionKeys `gridSelectedPositionKeySet` 的返回值
 */
export function gridHasMaterialExcludingKeys(grid, rows, cols, materialId, excludedPositionKeys) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excludedPositionKeys.has(`${r},${c}`)) continue;
      const t = grid[r]?.[c];
      if (t?.materialId === materialId) return true;
    }
  }
  return false;
}

/**
 * 公式区预览：所有已登记的棋盘光环材质乘数之积（仅统计未入本手拼词的格）。
 * @param {unknown[][]} grid
 * @param {number} rows
 * @param {number} cols
 * @param {Set<string>} excludedPositionKeys
 */
export function previewGridPresenceMultProduct(grid, rows, cols, excludedPositionKeys) {
  let mul = 1;
  for (const mid of GRID_PRESENCE_SCORE_MATERIAL_IDS) {
    if (!gridHasMaterialExcludingKeys(grid, rows, cols, mid, excludedPositionKeys)) continue;
    const factor = Number(GRID_PRESENCE_SCORE_MULT_BY_ID[mid]);
    if (Number.isFinite(factor) && factor > 0) mul *= factor;
  }
  return mul;
}

/**
 * 单次提交：某材质在「盘上且未入词」时的动效锚点格索引与额外触发次数（如重播配饰 +1 次）。
 * @param {unknown[][]} grid
 * @param {(tile: { accessoryId?: string | null } | null | undefined) => number} getGridEffectTriggerCount
 * @returns {{ anchorGridTileIndex: number | null, extraTriggerCount: number }}
 */
export function aggregateGridPresenceAnchorAndExtraTriggers(
  grid,
  rows,
  cols,
  materialId,
  excludedPositionKeys,
  getGridEffectTriggerCount,
) {
  let anchorGridTileIndex = null;
  let extraTriggerCount = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excludedPositionKeys.has(`${r},${c}`)) continue;
      const t = grid[r]?.[c];
      if (t?.materialId !== materialId) continue;
      if (anchorGridTileIndex == null) anchorGridTileIndex = r * cols + c;
      extraTriggerCount += Math.max(0, getGridEffectTriggerCount(t) - 1);
    }
  }
  return { anchorGridTileIndex, extraTriggerCount };
}
