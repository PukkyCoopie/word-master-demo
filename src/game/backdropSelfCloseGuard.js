/** pointerdown / 长按同步打开浮层后，同一次触控松手会在蒙层上合成 click；click.self 关闭时须短暂忽略 */
export const BACKDROP_SELF_CLOSE_GUARD_MS = 480;

/**
 * @param {number} [guardMs]
 */
export function createBackdropSelfCloseGuard(guardMs = BACKDROP_SELF_CLOSE_GUARD_MS) {
  let suppressUntil = 0;

  function arm() {
    suppressUntil = performance.now() + guardMs;
  }

  function shouldSuppress() {
    return performance.now() < suppressUntil;
  }

  /** @param {() => void} close */
  function onBackdropSelfClick(close) {
    if (shouldSuppress()) return;
    close();
  }

  return { arm, shouldSuppress, onBackdropSelfClick };
}
