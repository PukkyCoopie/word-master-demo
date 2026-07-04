import { gridTileHasMaterial } from "./volcanoEruptionTargets.js";

const WATER_MATERIAL_ID = "water";

/** @param {unknown} tile */
export function isFountainWaterConversionCandidate(tile) {
  if (!tile || typeof tile !== "object") return false;
  const t = /** @type {{ letter?: string, bossGridBlocked?: boolean, materialId?: unknown }} */ (tile);
  if (!String(t.letter ?? "").trim()) return false;
  if (t.bossGridBlocked === true) return false;
  if (String(t.materialId ?? "").trim() === WATER_MATERIAL_ID) return false;
  return true;
}

/**
 * @param {object[][] | null | undefined} grid
 * @returns {{ noMaterial: { row: number, col: number }[], withMaterial: { row: number, col: number }[] }}
 */
export function collectFountainWaterConversionCandidates(grid) {
  /** @type {{ row: number, col: number }[]} */
  const noMaterial = [];
  /** @type {{ row: number, col: number }[]} */
  const withMaterial = [];
  if (!Array.isArray(grid)) return { noMaterial, withMaterial };
  for (let row = 0; row < grid.length; row += 1) {
    const rowArr = grid[row];
    if (!Array.isArray(rowArr)) continue;
    for (let col = 0; col < rowArr.length; col += 1) {
      const tile = rowArr[col];
      if (!isFountainWaterConversionCandidate(tile)) continue;
      const cell = { row, col };
      if (!gridTileHasMaterial(tile)) noMaterial.push(cell);
      else withMaterial.push(cell);
    }
  }
  return { noMaterial, withMaterial };
}

/**
 * @param {object[][] | null | undefined} grid
 * @param {() => number} [rng]
 * @returns {{ row: number, col: number } | null}
 */
export function pickRandomFountainWaterTarget(grid, rng = Math.random) {
  const { noMaterial, withMaterial } = collectFountainWaterConversionCandidates(grid);
  const pool = noMaterial.length > 0 ? noMaterial : withMaterial;
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)];
}
