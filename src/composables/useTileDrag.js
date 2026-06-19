import { computed, nextTick, onUnmounted, ref, shallowRef } from "vue";
import {
  TREASURE_SLOT_DRAG_THRESHOLD_PX,
  buildDragPreviewSlots,
} from "./useTreasureSlotReorder.js";

/** @typedef {{ zone: 'grid', row: number, col: number } | { zone: 'word', slotIndex: number }} TileDragSource */

/**
 * 拼词区插入预览：在 hover 处留 null，其余项后移。
 * @template T
 * @param {readonly T[]} list
 * @param {number} hover
 */
export function buildInsertDragPreviewSlots(list, hover) {
  if (!Array.isArray(list)) return [];
  const clamped = Math.max(0, Math.min(list.length, hover));
  const result = [...list];
  result.splice(clamped, 0, null);
  return result;
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {DOMRect} rect
 */
function pointInRect(clientX, clientY, rect) {
  return (
    clientX >= rect.left
    && clientX <= rect.right
    && clientY >= rect.top
    && clientY <= rect.bottom
  );
}

/**
 * @param {DOMRect} rect
 * @param {DOMRect} containerRect
 */
function rectStyleInContainer(rect, containerRect) {
  return {
    left: `${rect.left - containerRect.left}px`,
    top: `${rect.top - containerRect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

function preventIfCancelable(ev) {
  if (ev.cancelable) ev.preventDefault();
}

/**
 * 棋盘 / 拼词区字母块拖动：grid↔word、word 内重排；word→grid 松手后由外部播回格动画。
 *
 * @param {object} options
 * @param {() => boolean} [options.canDrag]
 * @param {() => number} options.getWordSlotCount
 * @param {(index: number) => DOMRect | null | undefined} options.getWordSlotRect
 * @param {() => HTMLElement | null | undefined} options.getWordOverlayContainer
 * @param {() => HTMLElement | null | undefined} options.getGridOverlayContainer
 * @param {(flatIndex: number) => HTMLElement | null | undefined} options.getGridTileElement
 * @param {() => number} options.getGridCellCount
 * @param {() => number} options.getGridCols
 * @param {() => HTMLElement | null | undefined} options.getWordHitArea
 * @param {() => HTMLElement | null | undefined} options.getGridHitArea
 * @param {() => object | null} options.getDragTilePresentation
 * @param {(source: TileDragSource) => boolean} [options.canStartFromSource]
 * @param {(pointerId: number) => void} [options.onDragStarted]
 * @param {(row: number, col: number, wordIndex: number) => void} options.onCommitGridToWord
 * @param {(from: number, to: number) => void} options.onCommitWordReorder
 * @param {(index: number, layoutCount: number) => DOMRect | null | undefined} [options.getWordSlotRectForLayout]
 * @param {(index: number) => HTMLElement | null | undefined} [options.getWordSlotElement]
 * @param {(index: number) => boolean} [options.isWordSlotDragPlaceholder]
 * @param {() => number} [options.getWordSourceHomeFlatIndex] 拼词区拖出时原棋盘 flat 下标
 * @param {(slotIndex: number, clientX: number, clientY: number, ghost: { width: number, height: number, offsetX: number, offsetY: number }) => void} options.onCommitWordToGrid
 */
export function useTileDrag(options) {
  const {
    canDrag = () => true,
    getWordSlotCount,
    getWordSlotRect,
    getWordSlotRectForLayout = null,
    getWordSlotElement = null,
    isWordSlotDragPlaceholder = null,
    getWordOverlayContainer,
    getGridOverlayContainer,
    getGridTileElement,
    getGridCellCount,
    getGridCols,
    getWordHitArea,
    getGridHitArea,
    getDragTilePresentation,
    canStartFromSource = () => true,
    getWordSourceHomeFlatIndex = () => -1,
    onDragStarted = () => {},
    onCommitGridToWord,
    onCommitWordReorder,
    onCommitWordToGrid,
  } = options;

  const dragActive = ref(false);
  /** @type {import('vue').Ref<TileDragSource | null>} */
  const dragSource = ref(null);
  const dragHoverWordIndex = ref(-1);
  /** @type {import('vue').Ref<{ row: number, col: number } | null>} */
  const dragHoverGrid = ref(null);
  /** @type {'word' | 'grid' | null} */
  const dragHoverZone = ref(null);
  const dragMoved = ref(false);

  /** @type {import('vue').Ref<Record<string, string>>} */
  const dragGhostStyle = ref({});
  /** @type {import('vue').Ref<Record<string, string>>} */
  const dragWordPlaceholderStyle = ref({});
  /** @type {import('vue').Ref<Record<string, string>>} */
  const dragGridPlaceholderStyle = ref({});

  const dragGhostVisible = computed(() => dragActive.value && getDragTilePresentation() != null);
  const dragWordPlaceholderVisible = computed(
    () => dragActive.value
      && dragHoverZone.value === "word"
      && dragHoverWordIndex.value >= 0
      && dragSource.value?.zone === "word",
  );
  const dragGridPlaceholderVisible = computed(
    () => dragActive.value
      && getDragTilePresentation() != null
      && dragSource.value?.zone === "word"
      && dragHoverGrid.value != null,
  );

  /** @type {{ cleanup: (() => void) | null, pointerId: number | null, slotEl: HTMLElement | null }} */
  let pointerSession = { cleanup: null, pointerId: null, slotEl: null };
  /** @type {{ x: number, y: number, w: number, h: number } | null} */
  let ghostOffset = null;

  function clearPointerSession() {
    if (pointerSession.slotEl && pointerSession.pointerId != null) {
      try {
        pointerSession.slotEl.releasePointerCapture(pointerSession.pointerId);
      } catch {
        // no-op
      }
    }
    if (pointerSession.cleanup) {
      pointerSession.cleanup();
      pointerSession.cleanup = null;
    }
    pointerSession = { cleanup: null, pointerId: null, slotEl: null };
  }

  function measureWordSlotInContainer(index) {
    const source = dragSource.value;
    const layoutCount = source?.zone === "grid" && dragHoverZone.value === "word"
      ? getWordSlotCount() + 1
      : getEffectiveWordDropCount();
    const rect = wordSlotRectAt(index, layoutCount);
    const container = getWordOverlayContainer();
    if (!rect || !(container instanceof HTMLElement)) return null;
    return {
      slotRect: rect,
      containerRect: container.getBoundingClientRect(),
    };
  }

  function measureGridCellInContainer(flatIndex) {
    const el = getGridTileElement(flatIndex);
    const container = getGridOverlayContainer();
    if (!(el instanceof HTMLElement) || !(container instanceof HTMLElement)) return null;
    const slotRect = el.getBoundingClientRect();
    return {
      slotRect,
      containerRect: container.getBoundingClientRect(),
    };
  }

  function updateGhostPosition(clientX, clientY) {
    if (!ghostOffset) return;
    dragGhostStyle.value = {
      position: "fixed",
      left: "0",
      top: "0",
      width: `${ghostOffset.w}px`,
      height: `${ghostOffset.h}px`,
      transform: `translate(${clientX - ghostOffset.x}px, ${clientY - ghostOffset.y}px)`,
      zIndex: "320",
      pointerEvents: "none",
      transition: "none",
    };
  }

  function updateWordPlaceholderPosition(index) {
    const measured = measureWordSlotInContainer(index);
    if (!measured) return;
    dragWordPlaceholderStyle.value = {
      ...rectStyleInContainer(measured.slotRect, measured.containerRect),
      transition: "none",
    };
  }

  function updateGridPlaceholderPosition(flatIndex) {
    const measured = measureGridCellInContainer(flatIndex);
    if (!measured) return;
    dragGridPlaceholderStyle.value = {
      ...rectStyleInContainer(measured.slotRect, measured.containerRect),
      transition: "none",
    };
  }

  async function syncWordPlaceholderAfterLayout(index) {
    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (dragActive.value && dragHoverZone.value === "word") {
      updateWordPlaceholderPosition(index);
    }
  }

  async function syncGridPlaceholderAfterLayout(flatIndex) {
    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (dragActive.value && dragHoverGrid.value != null && flatIndex >= 0) {
      updateGridPlaceholderPosition(flatIndex);
    }
  }

  function wordSlotRectAt(index, layoutCount) {
    if (typeof getWordSlotRectForLayout === "function") {
      const r = getWordSlotRectForLayout(index, layoutCount);
      if (r) return r;
    }
    return getWordSlotRect(index);
  }

  /**
   * 固定布局槽位的水平范围（用于拖动时 Y 轴略偏出词条仍可按「第几位」判定）。
   * @param {number} slotCount
   */
  function getWordSlotLayoutSpan(slotCount) {
    /** @type {DOMRect[]} */
    const rects = [];
    for (let i = 0; i < slotCount; i += 1) {
      const rect = wordSlotRectAt(i, slotCount);
      if (rect && rect.width > 0 && rect.height > 0) rects.push(rect);
    }
    if (rects.length === 0) return null;
    return {
      left: Math.min(...rects.map((r) => r.left)),
      right: Math.max(...rects.map((r) => r.right)),
      top: Math.min(...rects.map((r) => r.top)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
    };
  }

  /**
   * @param {number} slotCount
   * @returns {{ index: number, rect: DOMRect }[]}
   */
  function collectWordSlotDomEntries(slotCount) {
    if (typeof getWordSlotElement !== "function") return [];
    /** @type {{ index: number, rect: DOMRect }[]} */
    const slots = [];
    for (let i = 0; i < slotCount; i += 1) {
      const el = getWordSlotElement(i);
      if (!(el instanceof HTMLElement)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;
      slots.push({ index: i, rect });
    }
    return slots;
  }

  /** @param {number} clientX @param {number} clientY @param {number} slotCount */
  function isPointerInWordHitArea(clientX, clientY, slotCount) {
    const wordArea = getWordHitArea();
    if (wordArea instanceof HTMLElement) {
      return pointInRect(clientX, clientY, wordArea.getBoundingClientRect());
    }
    return isClientXInWordSlotSpan(clientX, slotCount);
  }

  /** @param {number} clientX @param {number} slotCount */
  function isClientXInWordSlotSpan(clientX, slotCount) {
    const span = getWordSlotLayoutSpan(slotCount);
    if (!span) return false;
    return clientX >= span.left && clientX <= span.right;
  }

  /**
   * word 内重排：指针落在槽间空隙时，按空隙中线偏向最近槽位（宽空隙含 placeholder 时左右各半）。
   * @param {number} clientX
   * @param {{ index: number, rect: DOMRect }[]} letterSlots
   * @param {number} slotCount
   */
  function resolveWordReorderGapIndexFromLetters(clientX, letterSlots, slotCount) {
    if (letterSlots.length === 0) return 0;

    const first = letterSlots[0];
    if (clientX < first.rect.left) return first.index;

    for (let i = 0; i < letterSlots.length - 1; i += 1) {
      const left = letterSlots[i];
      const right = letterSlots[i + 1];
      const gapLeft = left.rect.right;
      const gapRight = right.rect.left;
      if (clientX < gapLeft || clientX > gapRight) continue;

      const gapMid = (gapLeft + gapRight) / 2;
      if (right.index > left.index + 1) {
        return clientX < gapMid ? left.index + 1 : right.index;
      }
      return clientX < gapMid ? left.index : right.index;
    }

    const last = letterSlots[letterSlots.length - 1];
    return Math.min(last.index, slotCount - 1);
  }

  /**
   * @param {number} clientX
   * @param {{ index: number, rect: DOMRect }[]} slots
   */
  function resolveWordPositionIndexFromGapDom(clientX, slots) {
    if (clientX < slots[0].rect.left) return slots[0].index;
    for (let i = 0; i < slots.length - 1; i += 1) {
      const gapMid = (slots[i].rect.right + slots[i + 1].rect.left) / 2;
      if (clientX < gapMid) return slots[i].index;
    }
    return slots[slots.length - 1].index;
  }

  /** grid→word 插入：落在字母上默认插在其后，仅左缘窄条插在其前 */
  const GRID_INSERT_BEFORE_RECT_FRACTION = 0.22;

  /**
   * 指针落在某槽矩形内时的插入下标。
   * @param {number} clientX
   * @param {number} index
   * @param {DOMRect} rect
   * @param {number} slotCount
   * @param {{ gridInsert?: boolean }} [options]
   */
  function resolveWordInsertIndexInRect(clientX, index, rect, slotCount, { gridInsert = false } = {}) {
    if (gridInsert) {
      const leftInsertBefore = rect.left + rect.width * GRID_INSERT_BEFORE_RECT_FRACTION;
      if (clientX < leftInsertBefore) return index;
      return Math.min(index + 1, slotCount - 1);
    }
    const mid = (rect.left + rect.right) / 2;
    if (clientX < mid) return index;
    return Math.min(index + 1, slotCount - 1);
  }

  /**
   * word 内重排：与宝藏栏一致，指针落在哪一格即 hover 哪一格；空隙再用 gap 判定。
   * @param {number} clientX
   * @param {readonly { index: number, rect: DOMRect }[]} slots
   * @param {number} slotCount
   */
  function resolveWordReorderIndexFromDom(clientX, slots, slotCount) {
    for (const { index, rect } of slots) {
      if (typeof isWordSlotDragPlaceholder === "function" && isWordSlotDragPlaceholder(index)) {
        continue;
      }
      if (clientX < rect.left || clientX > rect.right) continue;
      return index;
    }
    const letterSlots = typeof isWordSlotDragPlaceholder === "function"
      ? slots.filter(({ index }) => !isWordSlotDragPlaceholder(index))
      : slots;
    return resolveWordReorderGapIndexFromLetters(clientX, letterSlots, slotCount);
  }

  /**
   * 拼词区落点：优先用已动画槽位的 DOM 矩形（与预览一致）。
   * grid 插入：占位槽 X 命中优先；落在字母上默认插在其后（仅左缘窄条插在其前）。
   * word 重排：占位槽优先；落在字母槽上整格命中，槽间空隙再用 gap 判定。
   * @param {number} clientX
   * @param {number} clientY
   * @param {number} slotCount
   */
  function resolveWordPositionIndexFromDomPoint(clientX, clientY, slotCount) {
    const slots = collectWordSlotDomEntries(slotCount);
    if (slots.length === 0) return -1;

    const gridInsert = dragSource.value?.zone === "grid";

    if (typeof isWordSlotDragPlaceholder === "function") {
      for (const { index, rect } of slots) {
        if (!isWordSlotDragPlaceholder(index)) continue;
        if (clientX >= rect.left && clientX <= rect.right) return index;
      }
    }

    if (gridInsert) {
      for (const { index, rect } of slots) {
        if (typeof isWordSlotDragPlaceholder === "function" && isWordSlotDragPlaceholder(index)) {
          continue;
        }
        if (clientX < rect.left || clientX > rect.right) continue;
        return resolveWordInsertIndexInRect(clientX, index, rect, slotCount, { gridInsert: true });
      }
    } else {
      return resolveWordReorderIndexFromDom(clientX, slots, slotCount);
    }

    for (const { index, rect } of slots) {
      const mid = (rect.left + rect.right) / 2;
      if (clientX < mid) return index;
    }
    return slots[slots.length - 1].index;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @param {number} slotCount
   */
  function resolveWordHoverIndex(clientX, clientY, slotCount) {
    const source = dragSource.value;
    const useDom = dragHoverZone.value === "word"
      && (source?.zone === "word" || source?.zone === "grid");
    if (useDom) {
      const domIdx = resolveWordPositionIndexFromDomPoint(clientX, clientY, slotCount);
      if (domIdx >= 0) return domIdx;
    }
    return resolveWordPositionIndexFromPoint(clientX, slotCount);
  }

  /**
   * 拼词区落点（数学槽位 fallback）：按固定槽位区域判定，不依赖槽内是哪枚字母。
   * @param {number} clientX
   * @param {number} slotCount
   */
  function resolveWordPositionIndexFromPoint(clientX, slotCount) {
    if (slotCount <= 0) return 0;

    /** @type {{ index: number, rect: DOMRect }[]} */
    const slots = [];
    for (let i = 0; i < slotCount; i += 1) {
      const rect = wordSlotRectAt(i, slotCount);
      if (!rect || rect.width <= 0 || rect.height <= 0) continue;
      slots.push({ index: i, rect });
    }
    if (slots.length === 0) return 0;

    if (clientX < slots[0].rect.left) return slots[0].index;

    if (dragSource.value?.zone === "word") {
      for (const { index, rect } of slots) {
        if (clientX < rect.left || clientX > rect.right) continue;
        return index;
      }
      return resolveWordReorderGapIndexFromLetters(clientX, slots, slotCount);
    }

    for (let i = 0; i < slots.length - 1; i += 1) {
      const leftRect = slots[i].rect;
      const rightRect = slots[i + 1].rect;
      const gapMid = (leftRect.right + rightRect.left) / 2;
      if (clientX < gapMid) return slots[i].index;
    }
    return slots[slots.length - 1].index;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @param {number} slotCount
   */
  function isPointerOverWordDropStrip(clientX, clientY, slotCount) {
    if (isClientXInWordSlotSpan(clientX, slotCount)) return true;
    const wordArea = getWordHitArea();
    if (wordArea instanceof HTMLElement) {
      return pointInRect(clientX, clientY, wordArea.getBoundingClientRect());
    }
    return false;
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   */
  function resolveGridCellFromPoint(clientX, clientY) {
    const count = getGridCellCount();
    for (let i = 0; i < count; i += 1) {
      const el = getGridTileElement(i);
      if (!(el instanceof HTMLElement)) continue;
      const rect = el.getBoundingClientRect();
      if (pointInRect(clientX, clientY, rect)) {
        return { flatIndex: i };
      }
    }
    return null;
  }

  /** word 源在拼词区重排时始终按完整词长判定，不受 grid 区 N-1 布局影响 */
  function getWordHoverDropCount() {
    const source = dragSource.value;
    if (source?.zone === "word") return getWordSlotCount();
    if (source?.zone === "grid") return getWordSlotCount() + 1;
    return getWordSlotCount();
  }

  function getEffectiveWordDropCount() {
    const source = dragSource.value;
    if (!source) return getWordSlotCount();
    if (source.zone === "grid" && dragHoverZone.value === "word") {
      return getWordSlotCount() + 1;
    }
    if (source.zone === "word" && dragHoverZone.value === "grid") {
      return Math.max(0, getWordSlotCount() - 1);
    }
    return getWordSlotCount();
  }

  function setWordHover(index) {
    if (!dragActive.value) return;
    const max = getWordHoverDropCount() - 1;
    if (index < 0 || index > max) return;
    if (index === dragHoverWordIndex.value && dragHoverZone.value === "word") return;
    dragHoverGrid.value = null;
    dragGridPlaceholderStyle.value = {};
    // 先写 hover 再写 zone，避免 sync watcher 在 hoverIdx 仍为 -1 时触发并跳过 remap
    dragHoverWordIndex.value = index;
    dragHoverZone.value = "word";
    void syncWordPlaceholderAfterLayout(index);
  }

  /**
   * @param {{ row: number, col: number, flatIndex: number } | null} cell
   */
  function setGridHover(cell) {
    if (!dragActive.value) return;
    if (!cell) {
      if (dragHoverGrid.value == null && dragHoverZone.value === "grid") return;
      dragHoverZone.value = null;
      dragHoverGrid.value = null;
      dragGridPlaceholderStyle.value = {};
      return;
    }
    const prev = dragHoverGrid.value;
    if (prev && prev.row === cell.row && prev.col === cell.col && dragHoverZone.value === "grid") return;
    dragHoverZone.value = "grid";
    dragHoverWordIndex.value = -1;
    dragWordPlaceholderStyle.value = {};
    dragHoverGrid.value = { row: cell.row, col: cell.col };
    void syncGridPlaceholderAfterLayout(cell.flatIndex);
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   */
  function updateHoverFromPoint(clientX, clientY) {
    const gridArea = getGridHitArea();
    const source = dragSource.value;
    const stripDropCount = getWordHoverDropCount();
    const overWordStrip = isPointerOverWordDropStrip(clientX, clientY, stripDropCount);
    const overGrid = gridArea instanceof HTMLElement
      && pointInRect(clientX, clientY, gridArea.getBoundingClientRect());

    if (source?.zone === "word" && overGrid && !isPointerInWordHitArea(clientX, clientY, getWordSlotCount())) {
      const cols = getGridCols();
      const homeFlat = getWordSourceHomeFlatIndex();
      if (cols > 0 && homeFlat >= 0) {
        setGridHover({
          row: Math.floor(homeFlat / cols),
          col: homeFlat % cols,
          flatIndex: homeFlat,
        });
      } else {
        dragHoverZone.value = "grid";
        dragHoverWordIndex.value = -1;
        dragWordPlaceholderStyle.value = {};
        dragGridPlaceholderStyle.value = {};
        dragHoverGrid.value = null;
      }
      return;
    }

    if (overWordStrip) {
      const idx = resolveWordHoverIndex(clientX, clientY, stripDropCount);
      setWordHover(idx);
      return;
    }

    if (source?.zone === "grid" && overGrid) {
      dragHoverZone.value = null;
      dragHoverWordIndex.value = -1;
      dragWordPlaceholderStyle.value = {};
      dragGridPlaceholderStyle.value = {};
      return;
    }

    if (source?.zone === "grid") {
      dragHoverZone.value = null;
      dragHoverWordIndex.value = -1;
      dragWordPlaceholderStyle.value = {};
      dragGridPlaceholderStyle.value = {};
      return;
    }

    if (source?.zone === "word") {
      dragHoverZone.value = null;
      dragHoverWordIndex.value = -1;
      dragHoverGrid.value = null;
      dragWordPlaceholderStyle.value = {};
      dragGridPlaceholderStyle.value = {};
    }
  }

  /**
   * @param {TileDragSource} source
   * @param {number} clientX
   * @param {number} clientY
   * @param {HTMLElement} originEl
   */
  function beginDrag(source, clientX, clientY, originEl) {
    if (!canStartFromSource(source)) return;
    const rect = originEl.getBoundingClientRect();
    ghostOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };
    dragActive.value = true;
    dragSource.value = source;
    dragMoved.value = true;
    if (source.zone === "word") {
      dragHoverWordIndex.value = source.slotIndex;
      dragHoverZone.value = "word";
      void syncWordPlaceholderAfterLayout(source.slotIndex);
    } else {
      dragHoverWordIndex.value = -1;
      dragHoverZone.value = null;
      dragHoverGrid.value = null;
      dragGridPlaceholderStyle.value = {};
    }
    updateGhostPosition(clientX, clientY);
  }

  function endDrag() {
    if (!dragActive.value) return;
    dragActive.value = false;
    dragSource.value = null;
    dragHoverWordIndex.value = -1;
    dragHoverGrid.value = null;
    dragHoverZone.value = null;
    dragGhostStyle.value = {};
    dragWordPlaceholderStyle.value = {};
    dragGridPlaceholderStyle.value = {};
    ghostOffset = null;
    setTimeout(() => {
      dragMoved.value = false;
    }, 0);
  }

  /**
   * @param {TileDragSource} source
   * @param {PointerEvent} e
   * @param {HTMLElement} originEl
   */
  function startPointerSession(source, e, originEl) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!canDrag()) return;
    if (!canStartFromSource(source)) return;

    clearPointerSession();
    preventIfCancelable(e);

    const pointerId = e.pointerId;
    try {
      originEl.setPointerCapture(pointerId);
    } catch {
      // no-op
    }
    pointerSession = { cleanup: null, pointerId, slotEl: originEl };

    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;

    /** @param {PointerEvent} ev */
    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < TREASURE_SLOT_DRAG_THRESHOLD_PX) {
          return;
        }
        dragging = true;
        onDragStarted(pointerId);
        beginDrag(source, ev.clientX, ev.clientY, originEl);
      }
      preventIfCancelable(ev);
      updateGhostPosition(ev.clientX, ev.clientY);
      updateHoverFromPoint(ev.clientX, ev.clientY);
    };

    /** @param {PointerEvent} ev */
    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      clearPointerSession();
      if (!dragging) return;
      preventIfCancelable(ev);
      dragging = false;

      updateHoverFromPoint(ev.clientX, ev.clientY);

      const src = dragSource.value;
      let zone = dragHoverZone.value;
      let wordIdx = dragHoverWordIndex.value;

      if (src?.zone === "word" && zone !== "word") {
        const dropCount = getWordSlotCount();
        if (
          isPointerInWordHitArea(ev.clientX, ev.clientY, dropCount)
          && isClientXInWordSlotSpan(ev.clientX, dropCount)
        ) {
          wordIdx = resolveWordHoverIndex(ev.clientX, ev.clientY, dropCount);
          zone = "word";
        }
      }

      if (src?.zone === "grid" && zone === "word" && wordIdx >= 0) {
        onCommitGridToWord(src.row, src.col, wordIdx);
      } else if (src?.zone === "word" && zone === "word" && wordIdx >= 0 && wordIdx !== src.slotIndex) {
        onCommitWordReorder(src.slotIndex, wordIdx);
      } else if (src?.zone === "word" && zone === "grid") {
        const ghost = ghostOffset ?? { w: 0, h: 0, x: 0, y: 0 };
        onCommitWordToGrid(src.slotIndex, ev.clientX, ev.clientY, {
          width: ghost.w,
          height: ghost.h,
          offsetX: ghost.x,
          offsetY: ghost.y,
        });
      }

      endDrag();
    };

    const moveOpts = { passive: false };
    window.addEventListener("pointermove", onMove, moveOpts);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    pointerSession.cleanup = () => {
      window.removeEventListener("pointermove", onMove, moveOpts);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }

  /** @param {number} row @param {number} col @param {PointerEvent} e */
  function onGridTilePointerDown(row, col, e) {
    const el = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
    if (!el) return;
    startPointerSession({ zone: "grid", row, col }, e, el);
  }

  /** @param {number} slotIndex @param {PointerEvent} e */
  function onWordSlotPointerDown(slotIndex, e) {
    const el = e.currentTarget instanceof HTMLElement ? e.currentTarget : null;
    if (!el) return;
    startPointerSession({ zone: "word", slotIndex }, e, el);
  }

  onUnmounted(() => {
    clearPointerSession();
    endDrag();
  });

  return {
    dragActive,
    dragSource,
    dragHoverWordIndex,
    dragHoverGrid,
    dragHoverZone,
    dragMoved,
    dragGhostVisible,
    dragWordPlaceholderVisible,
    dragGridPlaceholderVisible,
    dragGhostStyle,
    dragWordPlaceholderStyle,
    dragGridPlaceholderStyle,
    onGridTilePointerDown,
    onWordSlotPointerDown,
    buildDragPreviewSlots,
    buildInsertDragPreviewSlots,
  };
}
