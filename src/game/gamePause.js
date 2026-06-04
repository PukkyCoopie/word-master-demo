import gsap from "gsap";

let pauseDepth = 0;
/** @type {Set<() => void>} */
const unpauseWaiters = new Set();

/** @returns {boolean} */
export function isGamePaused() {
  return pauseDepth > 0;
}

/** 局内选项层等打开时冻结背景动效与计分时序 */
export function enterGamePause() {
  if (pauseDepth === 0) {
    gsap.globalTimeline.pause();
  }
  pauseDepth += 1;
}

export function exitGamePause() {
  if (pauseDepth <= 0) return;
  pauseDepth -= 1;
  if (pauseDepth === 0) {
    gsap.globalTimeline.resume();
    for (const wake of unpauseWaiters) wake();
    unpauseWaiters.clear();
  }
}

/** 组件卸载或异常时强制恢复 GSAP */
export function resetGamePause() {
  pauseDepth = 0;
  unpauseWaiters.clear();
  gsap.globalTimeline.resume();
}

function waitForGameUnpause() {
  if (!isGamePaused()) return Promise.resolve();
  return new Promise((resolve) => {
    unpauseWaiters.add(resolve);
  });
}

/**
 * 与 setTimeout 类似，但在 enterGamePause 期间不计时。
 * @param {number} ms
 * @returns {Promise<void>}
 */
export async function pauseAwareDelay(ms) {
  let remaining = Math.max(0, Math.round(ms));
  while (remaining > 0) {
    if (isGamePaused()) {
      await waitForGameUnpause();
      continue;
    }
    const chunk = Math.min(remaining, 32);
    await new Promise((resolve) => setTimeout(resolve, chunk));
    remaining -= chunk;
  }
}
