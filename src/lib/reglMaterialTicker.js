/**
 * 所有 tile 材质 regl 离屏 hub 共用一个 requestAnimationFrame，避免多材质多循环叠加。
 */
/** @type {Set<() => void>} */
const tickFns = new Set();
let rafId = 0;

function runAll() {
  rafId = 0;
  for (const fn of tickFns) {
    try {
      fn();
    } catch (e) {
      console.error(e);
    }
  }
  if (tickFns.size > 0) {
    rafId = requestAnimationFrame(runAll);
  }
}

/** @param {() => void} fn */
export function materialHubSubscribeTick(fn) {
  tickFns.add(fn);
  if (!rafId) {
    rafId = requestAnimationFrame(runAll);
  }
}

/** @param {() => void} fn */
export function materialHubUnsubscribeTick(fn) {
  tickFns.delete(fn);
  if (tickFns.size === 0 && rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function teardownMaterialTickerForHmr() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
  tickFns.clear();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownMaterialTickerForHmr();
  });
}
