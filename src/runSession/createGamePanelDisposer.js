/**
 * 汇总 GamePanel 卸载清理（R5）；dispose 幂等。
 * @param {Array<() => void>} cleanups
 */
export function createGamePanelDisposer(cleanups) {
  let disposed = false;

  return function disposeGamePanel() {
    if (disposed) return;
    disposed = true;
    for (const fn of cleanups) {
      try {
        fn();
      } catch (err) {
        console.error("[GamePanel] dispose failed:", err);
      }
    }
  };
}
