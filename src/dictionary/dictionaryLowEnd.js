/**
 * 低端机启发式：用于词库建索引策略（非精确判定）。
 */
export function isLikelyLowEndDevice() {
  if (typeof navigator === "undefined") return false;
  const deviceMemory = navigator.deviceMemory;
  if (typeof deviceMemory === "number" && deviceMemory > 0 && deviceMemory <= 4) return true;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores <= 4) return true;
  return false;
}

/**
 * @param {number} totalRows
 */
export function getDictionaryIndexYieldEvery(totalRows) {
  const total = Math.max(1, Math.floor(Number(totalRows) || 0));
  if (isLikelyLowEndDevice()) return Math.max(600, Math.ceil(total / 280));
  return Math.max(4000, Math.ceil(total / 96));
}

/**
 * 建索引批间让出主线程：低端机多等一帧，减轻 WebView 卡顿/OOM。
 */
export async function yieldDuringDictionaryIndex() {
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (isLikelyLowEndDevice()) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}
