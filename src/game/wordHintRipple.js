/** @typedef {{ row: number, col: number }} HintRippleCell */

const STAGGER_MS = 400;
const RIPPLE_CLASS = "grid-tile--hint-ripple";

/**
 * 依次在提示路径格子上播放 ripple 高亮。
 * @param {HintRippleCell[]} path
 * @param {(index: number) => HTMLElement | null | undefined} getGridTileElByIndex
 * @param {number} cols
 * @returns {Promise<void>}
 */
export function playWordHintRippleSequence(path, getGridTileElByIndex, cols) {
  const cells = Array.isArray(path) ? path : [];
  if (!cells.length) return Promise.resolve();

  return new Promise((resolve) => {
    let i = 0;

    /** @param {HTMLElement} el */
    function triggerRipple(el) {
      el.classList.remove(RIPPLE_CLASS);
      // 强制重排以重启动画
      void el.offsetWidth;
      el.classList.add(RIPPLE_CLASS);
      const onEnd = () => {
        el.removeEventListener("animationend", onEnd);
        el.classList.remove(RIPPLE_CLASS);
      };
      el.addEventListener("animationend", onEnd, { once: true });
    }

    function step() {
      if (i >= cells.length) {
        resolve();
        return;
      }
      const cell = cells[i];
      i += 1;
      const index = cell.row * cols + cell.col;
      const el = getGridTileElByIndex(index);
      if (el) triggerRipple(el);
      setTimeout(step, STAGGER_MS);
    }

    step();
  });
}
