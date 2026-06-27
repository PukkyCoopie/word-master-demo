import { shouldFreezeMaterialHubTicks } from "../game/gamePause.js";
import { isMaterialBenchEnabled } from "../dev/materialBenchGate.js";
import {
  getMaterialHubMaxHz,
  useNativeMaterialHubIntervalScheduler,
} from "./reglMaterialPerf.js";
import { isMaterialProfilerEnabled, recordMaterialTickerProfile } from "./reglMaterialProfiler.js";

/**
 * 所有 tile 材质 regl 离屏 hub 共用一个调度循环，避免多材质多 RAF 叠加。
 * - 桌面 / 浏览器：requestAnimationFrame + 60Hz 上限节流
 * - 原生 WebView（实验）：setInterval(16ms)，规避 RAF 被系统节流到 ~24Hz
 */
/** @type {Set<() => void>} */
const tickFns = new Set();
/** @type {(() => void)[]} */
const tickFnOrder = [];
let rafId = 0;
let intervalId = 0;
let lastTickAt = 0;

/** @type {{
 *   hubTicks: number,
 *   hubTickHz: number,
 *   activeHubs: number,
 *   lastTickMs: number,
 *   maxHz: number,
 *   scheduler: "raf" | "interval",
 *   rawCallbackHz: number,
 *   throttledSkips: number,
 * }} */
let tickerStats = {
  hubTicks: 0,
  hubTickHz: 0,
  activeHubs: 0,
  lastTickMs: 0,
  maxHz: 60,
  scheduler: "raf",
  rawCallbackHz: 0,
  throttledSkips: 0,
};

let statsWindowStart = 0;
let statsWindowTicks = 0;
let statsWindowRawCallbacks = 0;
let statsWindowThrottledSkips = 0;

function getMinTickIntervalMs() {
  const hz = getMaterialHubMaxHz();
  return hz > 0 ? 1000 / hz : Number.POSITIVE_INFINITY;
}

function refreshTickerStats(now) {
  if (!statsWindowStart) statsWindowStart = now;
  const elapsed = now - statsWindowStart;
  if (elapsed >= 500) {
    tickerStats = {
      ...tickerStats,
      hubTickHz: Math.round((statsWindowTicks * 1000) / elapsed),
      rawCallbackHz: Math.round((statsWindowRawCallbacks * 1000) / elapsed),
      throttledSkips: statsWindowThrottledSkips,
      activeHubs: tickFns.size,
      maxHz: getMaterialHubMaxHz(),
      scheduler: useNativeMaterialHubIntervalScheduler() ? "interval" : "raf",
    };
    statsWindowStart = now;
    statsWindowTicks = 0;
    statsWindowRawCallbacks = 0;
    statsWindowThrottledSkips = 0;
  }
  tickerStats.activeHubs = tickFns.size;
  tickerStats.maxHz = getMaterialHubMaxHz();
  tickerStats.scheduler = useNativeMaterialHubIntervalScheduler() ? "interval" : "raf";
}

/** @returns {typeof tickerStats} */
export function getMaterialTickerStats() {
  return { ...tickerStats };
}

function shouldExecuteHubWork() {
  if (document.hidden || tickFns.size === 0) return false;
  if (shouldFreezeMaterialHubTicks() && !isMaterialBenchEnabled()) return false;
  return true;
}

/**
 * @param {number} [now]
 * @param {{ fromInterval?: boolean }} [opts]
 */
function runAll(now, opts = {}) {
  const useInterval = useNativeMaterialHubIntervalScheduler();
  if (useInterval && !opts.fromInterval) return;

  if (!useInterval) {
    rafId = 0;
  }

  const minInterval = getMinTickIntervalMs();
  const t = typeof now === "number" && Number.isFinite(now) ? now : performance.now();

  if (!useInterval && lastTickAt > 0 && t - lastTickAt < minInterval) {
    statsWindowThrottledSkips += 1;
    tickerStats.throttledSkips = statsWindowThrottledSkips;
    ensureSchedulerRunning();
    return;
  }

  const tickDelta = lastTickAt > 0 ? t - lastTickAt : 0;
  lastTickAt = t;
  statsWindowRawCallbacks += 1;

  if (shouldExecuteHubWork()) {
    const order = tickFnOrder.filter((fn) => tickFns.has(fn));
    const profile = isMaterialProfilerEnabled();
    const tTick0 = profile ? performance.now() : 0;
    for (const fn of order) {
      try {
        fn();
      } catch (e) {
        console.error(e);
      }
    }
    if (profile) {
      recordMaterialTickerProfile(performance.now() - tTick0);
    }
    tickerStats.hubTicks += 1;
    statsWindowTicks += 1;
    tickerStats.lastTickMs = Math.round(tickDelta);
    refreshTickerStats(t);
  }

  if (!useInterval) {
    ensureSchedulerRunning();
  }
}

function stopRafScheduler() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function stopIntervalScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = 0;
  }
}

function ensureSchedulerRunning() {
  if (tickFns.size === 0) return;

  if (useNativeMaterialHubIntervalScheduler()) {
    stopRafScheduler();
    if (!intervalId) {
      const ms = getMinTickIntervalMs();
      if (!Number.isFinite(ms) || ms <= 0) return;
      intervalId = setInterval(() => {
        runAll(performance.now(), { fromInterval: true });
      }, ms);
    }
    return;
  }

  stopIntervalScheduler();
  if (!rafId) {
    rafId = requestAnimationFrame(runAll);
  }
}

/** @param {() => void} fn */
export function materialHubSubscribeTick(fn) {
  tickFns.add(fn);
  if (!tickFnOrder.includes(fn)) {
    tickFnOrder.push(fn);
  }
  ensureSchedulerRunning();
}

/** @param {() => void} fn */
export function materialHubUnsubscribeTick(fn) {
  tickFns.delete(fn);
  const idx = tickFnOrder.indexOf(fn);
  if (idx >= 0) {
    tickFnOrder.splice(idx, 1);
  }
  if (tickFns.size === 0) {
    stopRafScheduler();
    stopIntervalScheduler();
    lastTickAt = 0;
  }
  tickerStats.activeHubs = tickFns.size;
}

function teardownMaterialTickerForHmr() {
  stopRafScheduler();
  stopIntervalScheduler();
  lastTickAt = 0;
  statsWindowStart = 0;
  statsWindowTicks = 0;
  statsWindowRawCallbacks = 0;
  statsWindowThrottledSkips = 0;
  tickFns.clear();
  tickFnOrder.length = 0;
  tickerStats = {
    hubTicks: 0,
    hubTickHz: 0,
    activeHubs: 0,
    lastTickMs: 0,
    maxHz: getMaterialHubMaxHz(),
    scheduler: "raf",
    rawCallbackHz: 0,
    throttledSkips: 0,
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownMaterialTickerForHmr();
  });
}
