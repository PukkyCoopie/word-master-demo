/** @returns {boolean} 是否进入材质性能实验页 */
export function isMaterialBenchEnabled() {
  if (import.meta.env.VITE_MATERIAL_BENCH === "1") return true;
  if (!import.meta.env.DEV) return false;
  try {
    return new URLSearchParams(window.location.search).get("materialBench") === "1";
  } catch {
    return false;
  }
}
