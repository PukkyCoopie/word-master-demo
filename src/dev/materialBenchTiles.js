/** 材质实验页最大格数（与 BENCH_TILES 定义一致） */
export const MATERIAL_BENCH_MAX_TILES = 10;

/** @returns {number} 1–10 */
export function getMaterialBenchTileCount() {
  try {
    const raw = globalThis.__WM_BENCH_TILE_COUNT__;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1) {
      return Math.min(MATERIAL_BENCH_MAX_TILES, Math.round(n));
    }
  } catch {
    // no-op
  }
  return MATERIAL_BENCH_MAX_TILES;
}

/** @param {number} count */
export function setMaterialBenchTileCount(count) {
  const n = Math.min(MATERIAL_BENCH_MAX_TILES, Math.max(1, Math.round(Number(count) || 1)));
  globalThis.__WM_BENCH_TILE_COUNT__ = n;
  try {
    window.dispatchEvent(new CustomEvent("wm-bench-tile-count", { detail: { count: n } }));
  } catch {
    // no-op
  }
  return n;
}
