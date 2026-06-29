import { gridTileHasMaterial } from "./volcanoEruptionTargets.js";

/** @param {unknown} tile */
export function isNoMaterialLetterTile(tile) {
  if (!tile || typeof tile !== "object") return false;
  const t = /** @type {{ letter?: string, bossGridBlocked?: boolean }} */ (tile);
  if (!String(t.letter ?? "").trim()) return false;
  if (t.bossGridBlocked === true) return false;
  return !gridTileHasMaterial(tile);
}

/** @param {unknown} tile */
export function isFireGridTile(tile) {
  if (!tile || typeof tile !== "object") return false;
  return String(/** @type {{ materialId?: unknown }} */ (tile).materialId ?? "").trim() === "fire";
}

/**
 * 遍历整盘 grid：每个火焰格（含已选入拼词、仍留 placeholder 的格）引燃正上方无材质字母块。
 * @param {object[][] | null | undefined} grid
 * @returns {{ row: number, col: number }[]}
 */
export function collectFireworkIgniteTargets(grid) {
  /** @type {{ row: number, col: number }[]} */
  const targets = [];
  if (!Array.isArray(grid)) return targets;
  for (let row = 0; row < grid.length; row += 1) {
    const rowArr = grid[row];
    if (!Array.isArray(rowArr)) continue;
    for (let col = 0; col < rowArr.length; col += 1) {
      if (!isFireGridTile(rowArr[col])) continue;
      const aboveRow = row - 1;
      if (aboveRow < 0) continue;
      const above = grid[aboveRow]?.[col];
      if (!isNoMaterialLetterTile(above)) continue;
      targets.push({ row: aboveRow, col });
    }
  }
  return targets;
}

/**
 * @param {{ row: number, col: number }[]} order
 * @param {number} row
 * @param {number} col
 */
export function findWordSlotIndexForGridCell(order, row, col) {
  if (!Array.isArray(order)) return -1;
  for (let i = 0; i < order.length; i += 1) {
    const pos = order[i];
    if (pos?.row === row && pos?.col === col) return i;
  }
  return -1;
}
