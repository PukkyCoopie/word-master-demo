/**
 * 材质管线性能剖析：按材质统计 WebGL draw / 2D blit 耗时（滑动窗口均值）。
 */
import { isMaterialBenchEnabled } from "../dev/materialBenchGate.js";

/** @typedef {{ drawMs: number, blitMs: number, blitCount: number, texPx: number, ticks: number }} MaterialProfileWindow */

/** @type {Map<string, MaterialProfileWindow>} */
const windows = new Map();

let tickerTotalMs = 0;
let tickerTicks = 0;
let statsWindowStart = 0;

/** @returns {boolean} */
export function isMaterialProfilerEnabled() {
  if (isMaterialBenchEnabled()) return true;
  if (import.meta.env.DEV) return true;
  try {
    return Boolean(globalThis.__WM_MATERIAL_PROFILE__);
  } catch {
    return false;
  }
}

/**
 * @param {string} materialId
 * @param {{ drawMs: number, blitMs: number, blitCount: number, texPx: number }} sample
 */
export function recordMaterialHubProfile(materialId, sample) {
  if (!isMaterialProfilerEnabled()) return;
  const id = String(materialId || "unknown");
  const prev = windows.get(id) ?? {
    drawMs: 0,
    blitMs: 0,
    blitCount: 0,
    texPx: sample.texPx,
    ticks: 0,
  };
  const n = prev.ticks + 1;
  windows.set(id, {
    drawMs: prev.drawMs + sample.drawMs,
    blitMs: prev.blitMs + sample.blitMs,
    blitCount: prev.blitCount + sample.blitCount,
    texPx: sample.texPx,
    ticks: n,
  });
}

/** @param {number} totalMs 单次 ticker 内所有 hub 合计 */
export function recordMaterialTickerProfile(totalMs) {
  if (!isMaterialProfilerEnabled()) return;
  tickerTotalMs += totalMs;
  tickerTicks += 1;
}

function resetProfilerWindow() {
  windows.clear();
  tickerTotalMs = 0;
  tickerTicks = 0;
  statsWindowStart = performance.now();
}

/**
 * @returns {{
 *   windowMs: number,
 *   ticker: { avgMs: number, ticks: number },
 *   materials: Array<{
 *     id: string,
 *     avgDrawMs: number,
 *     avgBlitMs: number,
 *     avgTotalMs: number,
 *     avgBlitCount: number,
 *     texPx: number,
 *     ticks: number,
 *     sharePct: number,
 *   }>,
 *   totals: { drawMs: number, blitMs: number, hubMs: number },
 * }}
 */
export function getMaterialProfilerReport() {
  const now = performance.now();
  if (!statsWindowStart) statsWindowStart = now;
  const windowMs = Math.max(1, now - statsWindowStart);

  /** @type {typeof import("./reglMaterialProfiler.js").getMaterialProfilerReport extends () => infer R ? R : never["materials"]} */
  const materials = [];
  let sumDraw = 0;
  let sumBlit = 0;
  let sumHub = 0;

  for (const [id, w] of windows.entries()) {
    if (w.ticks <= 0) continue;
    const avgDrawMs = w.drawMs / w.ticks;
    const avgBlitMs = w.blitMs / w.ticks;
    const avgTotalMs = avgDrawMs + avgBlitMs;
    sumDraw += avgDrawMs;
    sumBlit += avgBlitMs;
    sumHub += avgTotalMs;
    materials.push({
      id,
      avgDrawMs: roundMs(avgDrawMs),
      avgBlitMs: roundMs(avgBlitMs),
      avgTotalMs: roundMs(avgTotalMs),
      avgBlitCount: roundCount(w.blitCount / w.ticks),
      texPx: w.texPx,
      ticks: w.ticks,
      sharePct: 0,
    });
  }

  materials.sort((a, b) => b.avgTotalMs - a.avgTotalMs);
  const hubSum = sumHub > 0 ? sumHub : 1;
  for (const row of materials) {
    row.sharePct = roundPct((row.avgTotalMs / hubSum) * 100);
  }

  const report = {
    windowMs: Math.round(windowMs),
    ticker: {
      avgMs: tickerTicks > 0 ? roundMs(tickerTotalMs / tickerTicks) : 0,
      ticks: tickerTicks,
    },
    materials,
    totals: {
      drawMs: roundMs(sumDraw),
      blitMs: roundMs(sumBlit),
      hubMs: roundMs(sumHub),
    },
  };

  resetProfilerWindow();
  return report;
}

/** @param {number} v */
function roundMs(v) {
  return Math.round(v * 100) / 100;
}

/** @param {number} v */
function roundCount(v) {
  return Math.round(v * 10) / 10;
}

/** @param {number} v */
function roundPct(v) {
  return Math.round(v);
}

if (isMaterialProfilerEnabled()) {
  statsWindowStart = performance.now();
}
