/**
 * @param {DOMRectReadOnly | DOMRect} rect
 * @param {number} [padRpx=6]
 * @returns {{ x: number, y: number, width: number, height: number, rx: number }}
 */
export function inflateRectForTutorialHole(rect, padRpx = 6) {
  const root = document.documentElement;
  const rpx =
    Number.parseFloat(getComputedStyle(root).getPropertyValue("--rpx")) ||
    Math.min(window.innerWidth, window.innerHeight) / 750;
  const pad = padRpx * rpx;
  return {
    x: rect.left - pad,
    y: rect.top - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
    rx: 10 * rpx,
  };
}

/**
 * @param {Element | null | undefined} el
 * @param {Element | null | undefined} frameEl
 * @returns {DOMRect | null}
 */
export function measureElementRectInFrame(el, frameEl) {
  if (!el || !frameEl) return null;
  const elRect = el.getBoundingClientRect();
  const frameRect = frameEl.getBoundingClientRect();
  return new DOMRect(
    elRect.left - frameRect.left,
    elRect.top - frameRect.top,
    elRect.width,
    elRect.height,
  );
}

/**
 * @param {(Element | null | undefined)[]} elements
 * @param {Element | null | undefined} frameEl
 * @returns {{ x: number, y: number, width: number, height: number, rx: number }[]}
 */
export function measureTutorialHoles(elements, frameEl) {
  /** @type {{ x: number, y: number, width: number, height: number, rx: number }[]} */
  const holes = [];
  for (const el of elements) {
    const rect = measureElementRectInFrame(el, frameEl);
    if (!rect || rect.width <= 0 || rect.height <= 0) continue;
    holes.push(inflateRectForTutorialHole(rect));
  }
  return holes;
}

/**
 * @param {{ key: string, el: Element | null | undefined }[]} items
 * @param {Element | null | undefined} frameEl
 * @returns {{ key: string, x: number, y: number, width: number, height: number, rx: number }[]}
 */
export function measureKeyedTutorialHoles(items, frameEl) {
  /** @type {{ key: string, x: number, y: number, width: number, height: number, rx: number }[]} */
  const holes = [];
  for (const { key, el } of items) {
    const rect = measureElementRectInFrame(el, frameEl);
    if (!rect || rect.width <= 0 || rect.height <= 0) continue;
    holes.push({ key, ...inflateRectForTutorialHole(rect) });
  }
  return holes;
}
