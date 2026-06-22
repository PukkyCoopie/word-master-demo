/** 指针进入容器上下该比例区域时触发自动滚动 */
export const DRAG_EDGE_ZONE_RATIO = 0.2;

/** 刚进入判定区时的滚动速度（px / 帧） */
export const DRAG_EDGE_SCROLL_MIN_PX = 2;

/** 贴近或超出边缘时的滚动速度（px / 帧） */
export const DRAG_EDGE_SCROLL_MAX_PX = 18;

/**
 * 根据指针 Y 与滚动容器视口，计算边缘自动滚动速度。
 *
 * @param {number} clientY
 * @param {DOMRect} containerRect
 * @returns {number} 负值向上滚，正值向下滚，0 为不滚
 */
export function computeDragEdgeScrollSpeed(clientY, containerRect) {
  const height = containerRect.height;
  if (height <= 0) return 0;

  const zonePx = height * DRAG_EDGE_ZONE_RATIO;
  const topInnerY = containerRect.top + zonePx;
  const bottomInnerY = containerRect.bottom - zonePx;

  if (clientY < topInnerY) {
    const depth = zonePx > 0 ? (topInnerY - clientY) / zonePx : 1;
    return -speedFromEdgeDepth(depth);
  }

  if (clientY > bottomInnerY) {
    const depth = zonePx > 0 ? (clientY - bottomInnerY) / zonePx : 1;
    return speedFromEdgeDepth(depth);
  }

  return 0;
}

/** @param {number} depth 0=刚进入判定区，1=贴边，可>1 表示超出容器 */
function speedFromEdgeDepth(depth) {
  const clamped = Math.max(0, Math.min(1.5, depth));
  const eased = clamped * clamped;
  return DRAG_EDGE_SCROLL_MIN_PX + (DRAG_EDGE_SCROLL_MAX_PX - DRAG_EDGE_SCROLL_MIN_PX) * eased;
}

/**
 * 拖动期间在上下边缘区自动滚动容器（rAF 循环）。
 *
 * @param {object} options
 * @param {() => HTMLElement | null | undefined} options.getContainer
 * @param {() => void} [options.onStep] 每次成功滚动后回调（刷新落位/ghost）
 */
export function createDragEdgeAutoScrollLoop(options) {
  const { getContainer, onStep } = options;
  /** @type {number | null} */
  let rafId = null;
  let pointerY = 0;

  function stop() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function frame() {
    rafId = null;
    const container = getContainer();
    if (!(container instanceof HTMLElement)) return;

    const rect = container.getBoundingClientRect();
    const speed = computeDragEdgeScrollSpeed(pointerY, rect);
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    if (speed === 0 || maxScroll <= 0) return;

    const nextTop = container.scrollTop + speed;
    if (nextTop <= 0 && speed < 0) return;
    if (nextTop >= maxScroll && speed > 0) return;

    const clampedTop = Math.max(0, Math.min(maxScroll, nextTop));
    if (clampedTop === container.scrollTop) return;

    container.scrollTop = clampedTop;
    onStep?.();

    rafId = requestAnimationFrame(frame);
  }

  function scheduleFrame() {
    if (rafId != null) return;
    rafId = requestAnimationFrame(frame);
  }

  /** @param {number} clientY */
  function notifyPointerMove(clientY) {
    pointerY = clientY;
    const container = getContainer();
    if (!(container instanceof HTMLElement)) {
      stop();
      return;
    }

    const rect = container.getBoundingClientRect();
    const speed = computeDragEdgeScrollSpeed(pointerY, rect);
    const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
    if (speed === 0 || maxScroll <= 0) {
      stop();
      return;
    }
    if (speed < 0 && container.scrollTop <= 0) {
      stop();
      return;
    }
    if (speed > 0 && container.scrollTop >= maxScroll) {
      stop();
      return;
    }

    scheduleFrame();
  }

  return { notifyPointerMove, stop };
}
