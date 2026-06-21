import { computed, nextTick, onUnmounted, ref, shallowRef } from "vue";

/** 按下后移动超过该距离才进入拖动，避免与点击查看详情冲突 */
export const TREASURE_SLOT_DRAG_THRESHOLD_PX = 10;

export function swapArrayItems(list, a, b) {
  if (!Array.isArray(list)) return list;
  if (a < 0 || b < 0 || a >= list.length || b >= list.length) return list;
  if (a === b) return list;
  const next = [...list];
  const t = next[a];
  next[a] = next[b];
  next[b] = t;
  return next;
}

/** @param {readonly unknown[]} list @param {number} from @param {number} to */
export function reorderArrayItem(list, from, to) {
  if (!Array.isArray(list)) return list;
  if (from < 0 || from >= list.length) return list;
  const clampedTo = Math.max(0, Math.min(list.length - 1, to));
  if (from === clampedTo) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(clampedTo, 0, item);
  return next;
}

/**
 * 拖动预览：原槽空出，其余宝藏向 placeholder 槽位「挤开」，hover 处为 null。
 * @template T
 * @param {readonly T[]} list
 * @param {number} from
 * @param {number} hover
 * @returns {T[]}
 */
export function buildDragPreviewSlots(list, from, hover) {
  if (!Array.isArray(list) || from < 0 || from >= list.length) return [...list];
  const next = list.map((item, i) => (i === from ? null : item));
  if (from === hover) return next;
  const result = [...next];
  if (from < hover) {
    for (let i = from; i < hover; i += 1) {
      result[i] = result[i + 1];
    }
    result[hover] = null;
  } else {
    for (let i = from; i > hover; i -= 1) {
      result[i] = result[i - 1];
    }
    result[hover] = null;
  }
  return result;
}

/**
 * @param {readonly string[]} keys
 * @param {number} from
 * @param {number} hover
 */
export function buildDragPreviewKeys(keys, from, hover) {
  if (!Array.isArray(keys) || from < 0 || from >= keys.length) return [...keys];
  const draggedKey = keys[from];
  const next = keys.map((key, i) => (i === from ? null : key));
  if (from === hover) {
    return next.map((key, i) => (i === hover ? draggedKey : key));
  }
  const result = /** @type {(string | null)[]} */ ([...next]);
  if (from < hover) {
    for (let i = from; i < hover; i += 1) {
      result[i] = result[i + 1];
    }
    result[hover] = draggedKey;
  } else {
    for (let i = from; i > hover; i -= 1) {
      result[i] = result[i - 1];
    }
    result[hover] = draggedKey;
  }
  return /** @type {string[]} */ (result);
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} slotCount
 * @param {(index: number) => HTMLElement | null | undefined} getSlotElement
 */
function resolveSlotIndexFromPoint(clientX, clientY, slotCount, getSlotElement) {
  for (let i = 0; i < slotCount; i += 1) {
    const slotEl = getSlotElement(i);
    if (!(slotEl instanceof HTMLElement)) continue;
    const rect = slotEl.getBoundingClientRect();
    if (
      clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
    ) {
      return i;
    }
  }
  return -1;
}

/**
 * @param {DOMRect} rect
 * @param {DOMRect} containerRect
 */
export function rectStyleInContainer(rect, containerRect) {
  return {
    left: `${rect.left - containerRect.left}px`,
    top: `${rect.top - containerRect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ x: number, y: number, w: number, h: number }} ghostOffset
 * @param {HTMLElement} container
 */
export function buildTreasureDragGhostStyle(clientX, clientY, ghostOffset, container) {
  const containerRect = container.getBoundingClientRect();
  return {
    position: "absolute",
    left: `${clientX - ghostOffset.x - containerRect.left}px`,
    top: `${clientY - ghostOffset.y - containerRect.top}px`,
    width: `${ghostOffset.w}px`,
    height: `${ghostOffset.h}px`,
    zIndex: "320",
    pointerEvents: "none",
    transition: "none",
  };
}

/** @param {number} index @param {number} slotCount */
function clampInsertIndex(index, slotCount) {
  return Math.max(0, Math.min(slotCount - 1, Math.floor(Number(index) || 0)));
}

/**
 * @param {{ index: number, rect: DOMRect }} a
 * @param {{ index: number, rect: DOMRect }} b
 */
function sameGridRow(a, b) {
  const band = Math.min(a.rect.height, b.rect.height) * 0.42;
  return Math.abs(a.rect.top - b.rect.top) <= band;
}

/**
 * @param {{ index: number, rect: DOMRect }[]} entries
 */
function sortGridCellsByReadingOrder(entries) {
  entries.sort((a, b) => {
    if (sameGridRow(a, b)) return a.rect.left - b.rect.left;
    return a.rect.top - b.rect.top;
  });
  return entries;
}

/**
 * @param {number} slotCount
 * @param {(index: number) => HTMLElement | null | undefined} getSlotElement
 * @returns {Map<number, DOMRect>}
 */
export function captureGridLayoutRects(slotCount, getSlotElement) {
  /** @type {Map<number, DOMRect>} */
  const cache = new Map();
  for (let i = 0; i < slotCount; i += 1) {
    const el = getSlotElement(i);
    if (!(el instanceof HTMLElement)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width >= 1 && rect.height >= 1) cache.set(i, rect);
  }
  return cache;
}

/**
 * 基于拖动开始时的布局缓存，用相邻格中线对称判定落位索引（不随预览重排变化）。
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} slotCount
 * @param {Map<number, DOMRect> | null | undefined} rectCache
 */
export function resolveGridInsertIndexFromLayoutCache(clientX, clientY, slotCount, rectCache) {
  if (!rectCache?.size) return -1;

  /** @type {{ index: number, rect: DOMRect }[]} */
  const entries = [];
  for (let i = 0; i < slotCount; i += 1) {
    const rect = rectCache.get(i);
    if (!rect || rect.width < 1 || rect.height < 1) continue;
    entries.push({ index: i, rect });
  }
  if (!entries.length) return -1;
  sortGridCellsByReadingOrder(entries);

  for (let si = 0; si < entries.length; si += 1) {
    const curr = entries[si];
    const next = entries[si + 1];
    const { rect, index } = curr;

    if (clientY < rect.top) {
      return clampInsertIndex(index, slotCount);
    }

    if (!next) {
      if (clientY > rect.bottom) return clampInsertIndex(index, slotCount);
      const midX = rect.left + rect.width * 0.5;
      return clampInsertIndex(clientX < midX ? index : index + 1, slotCount);
    }

    if (sameGridRow(curr, next)) {
      if (clientY > rect.bottom) continue;
      const boundX = (rect.right + next.rect.left) * 0.5;
      if (clientY >= rect.top && clientY <= rect.bottom) {
        if (clientX < boundX) return clampInsertIndex(index, slotCount);
        continue;
      }
    } else {
      const boundY = (rect.bottom + next.rect.top) * 0.5;
      if (clientY < boundY) {
        const midX = rect.left + rect.width * 0.5;
        return clampInsertIndex(clientX < midX ? index : next.index, slotCount);
      }
    }
  }

  return clampInsertIndex(entries[entries.length - 1].index, slotCount);
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} lo
 * @param {number} hi
 * @param {Map<number, DOMRect> | null | undefined} rectCache
 * @param {number} marginPx
 */
function pointerCrossedAdjacentInsertBoundary(clientX, clientY, lo, hi, rectCache, marginPx) {
  const a = Math.min(lo, hi);
  const b = Math.max(lo, hi);
  const rectA = rectCache?.get(a);
  const rectB = rectCache?.get(b);
  if (!rectA || !rectB) return true;

  const margin = Math.max(0, Number(marginPx) || 0);
  const cellA = { index: a, rect: rectA };
  const cellB = { index: b, rect: rectB };

  if (sameGridRow(cellA, cellB)) {
    const boundX = (rectA.right + rectB.left) * 0.5;
    if (hi > lo) return clientX >= boundX + margin;
    return clientX <= boundX - margin;
  }

  const boundY = (rectA.bottom + rectB.top) * 0.5;
  if (hi > lo) return clientY >= boundY + margin;
  return clientY <= boundY - margin;
}

/**
 * 稳定落位：布局缓存 + 相邻索引迟滞，避免预览重排反馈抖动。
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} slotCount
 * @param {Map<number, DOMRect> | null | undefined} rectCache
 * @param {{ insert: number }} hysteresisState
 * @param {number} [marginPx=10]
 */
export function resolveStableGridInsertIndex(
  clientX,
  clientY,
  slotCount,
  rectCache,
  hysteresisState,
  marginPx = 10,
) {
  const raw = resolveGridInsertIndexFromLayoutCache(clientX, clientY, slotCount, rectCache);
  if (raw < 0) {
    return hysteresisState.insert >= 0
      ? clampInsertIndex(hysteresisState.insert, slotCount)
      : -1;
  }

  const prev = hysteresisState.insert;
  if (prev < 0 || raw === prev) {
    hysteresisState.insert = raw;
    return raw;
  }

  if (Math.abs(raw - prev) !== 1) {
    hysteresisState.insert = raw;
    return raw;
  }

  if (
    pointerCrossedAdjacentInsertBoundary(
      clientX,
      clientY,
      prev,
      raw,
      rectCache,
      marginPx,
    )
  ) {
    hysteresisState.insert = raw;
  }

  return clampInsertIndex(hysteresisState.insert, slotCount);
}

/**
 * 按阅读顺序（上→下、左→右），根据指针位置解析插入索引。
 * 使用实时 DOM（非稳定缓存）；弹窗 grid 请用 `resolveStableGridInsertIndex`。
 *
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} slotCount
 * @param {(index: number) => HTMLElement | null | undefined} getSlotElement
 * @returns {number}
 */
export function resolveReadingOrderInsertIndex(clientX, clientY, slotCount, getSlotElement) {
  const cache = captureGridLayoutRects(slotCount, getSlotElement);
  return resolveGridInsertIndexFromLayoutCache(clientX, clientY, slotCount, cache);
}

/**
 * 宝藏栏槽位重排：pointer 拖动；手指拖着宝藏外观自由移动，原位/目标位由半透明 placeholder 指示。
 *
 * @param {object} options
 * @param {() => readonly (object | null)[]} options.getSourceSlots
 * @param {import("vue").Ref<string[]>} options.keyOrder
 * @param {() => boolean} [options.canDrag]
 * @param {(preview: (object | null)[]) => void} options.onCommit
 * @param {(index: number) => HTMLElement | null | undefined} [options.getSlotElement]
 * @param {() => HTMLElement | null | undefined} [options.getOverlayContainer]
 * @param {() => boolean} [options.stackMode]
 */
export function useTreasureSlotReorder(options) {
  const {
    getSourceSlots,
    keyOrder,
    canDrag = () => true,
    onCommit,
    getSlotElement = () => null,
    getOverlayContainer = () => null,
    stackMode = () => false,
  } = options;

  const dragActive = ref(false);
  const dragSourceIndex = ref(-1);
  const dragHoverIndex = ref(-1);
  const dragMoved = ref(false);
  const dragTreasure = shallowRef(/** @type {object | null} */ (null));

  /** @type {import("vue").Ref<Record<string, string>>} */
  const dragGhostStyle = ref({});
  /** @type {import("vue").Ref<Record<string, string>>} */
  const dragPlaceholderStyle = ref({});

  const dragGhostVisible = computed(() => dragActive.value && dragTreasure.value != null);
  const dragPlaceholderVisible = computed(() => dragActive.value && dragTreasure.value != null);

  const displaySlots = computed(() => {
    if (!dragActive.value) return getSourceSlots();
    return buildDragPreviewSlots(getSourceSlots(), dragSourceIndex.value, dragHoverIndex.value);
  });

  const displayKeys = computed(() => {
    const keys = Array.isArray(keyOrder?.value) ? keyOrder.value : [];
    if (!dragActive.value) return keys;
    return buildDragPreviewKeys(keys, dragSourceIndex.value, dragHoverIndex.value);
  });

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

  function measureSlotInContainer(index) {
    const slotEl = getSlotElement(index);
    const container = getOverlayContainer();
    if (!(slotEl instanceof HTMLElement) || !(container instanceof HTMLElement)) return null;
    return {
      slotRect: slotEl.getBoundingClientRect(),
      containerRect: container.getBoundingClientRect(),
    };
  }

  function updateGhostPosition(clientX, clientY) {
    if (!ghostOffset) return;
    const container = getOverlayContainer();
    if (!(container instanceof HTMLElement)) return;
    dragGhostStyle.value = buildTreasureDragGhostStyle(clientX, clientY, ghostOffset, container);
  }

  function updatePlaceholderPosition(index) {
    const measured = measureSlotInContainer(index);
    if (!measured) return;
    dragPlaceholderStyle.value = {
      position: "absolute",
      ...rectStyleInContainer(measured.slotRect, measured.containerRect),
      transition: "none",
    };
  }

  async function syncPlaceholderAfterLayout(index) {
    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (dragActive.value) {
      updatePlaceholderPosition(index);
    }
  }

  function setHoverIndex(index) {
    if (!dragActive.value) return;
    const slots = getSourceSlots();
    const max = slots.length - 1;
    if (index < 0 || index > max) return;
    if (index === dragHoverIndex.value) return;
    dragHoverIndex.value = index;
    void syncPlaceholderAfterLayout(index);
  }

  function beginDrag(slotIndex, clientX, clientY, slotEl) {
    const slots = getSourceSlots();
    const treasure = slots[slotIndex];
    if (!treasure) return;

    const rect = slotEl.getBoundingClientRect();
    ghostOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };

    dragActive.value = true;
    dragSourceIndex.value = slotIndex;
    dragHoverIndex.value = slotIndex;
    dragTreasure.value = treasure;
    updateGhostPosition(clientX, clientY);
    void syncPlaceholderAfterLayout(slotIndex);
  }

  function commitDrag() {
    const from = dragSourceIndex.value;
    const to = dragHoverIndex.value;
    if (from < 0 || to < 0 || from === to) return;
    const nextSlots = reorderArrayItem(getSourceSlots(), from, to);
    const nextKeys = reorderArrayItem(keyOrder.value, from, to);
    keyOrder.value = nextKeys;
    onCommit(nextSlots);
  }

  function endDrag() {
    if (!dragActive.value) return;
    dragActive.value = false;
    dragSourceIndex.value = -1;
    dragHoverIndex.value = -1;
    dragTreasure.value = null;
    dragGhostStyle.value = {};
    dragPlaceholderStyle.value = {};
    ghostOffset = null;
    setTimeout(() => {
      dragMoved.value = false;
    }, 0);
  }

  /** @param {number} slotIndex @param {PointerEvent} e */
  function onSlotPointerDown(slotIndex, e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!canDrag()) return;

    const slots = getSourceSlots();
    if (!slots[slotIndex]) return;

    const slotEl = e.currentTarget instanceof Element ? e.currentTarget : null;
    if (!(slotEl instanceof HTMLElement)) return;

    const containerEl = slotEl.closest(".treasure-slots");
    if (!(containerEl instanceof HTMLElement)) return;

    clearPointerSession();
    e.preventDefault();

    const pointerId = e.pointerId;
    try {
      slotEl.setPointerCapture(pointerId);
    } catch {
      // no-op
    }
    pointerSession = { cleanup: null, pointerId, slotEl };

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
        dragMoved.value = true;
        beginDrag(slotIndex, ev.clientX, ev.clientY, slotEl);
      }
      ev.preventDefault();
      updateGhostPosition(ev.clientX, ev.clientY);
      const targetIndex = stackMode()
        ? resolveReadingOrderInsertIndex(
            ev.clientX,
            ev.clientY,
            getSourceSlots().length,
            getSlotElement,
          )
        : resolveSlotIndexFromPoint(
            ev.clientX,
            ev.clientY,
            getSourceSlots().length,
            getSlotElement,
          );
      setHoverIndex(targetIndex);
    };

    /** @param {PointerEvent} ev */
    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      clearPointerSession();
      if (!dragging) return;

      ev.preventDefault();
      dragging = false;

      const targetIndex = stackMode()
        ? resolveReadingOrderInsertIndex(
            ev.clientX,
            ev.clientY,
            getSourceSlots().length,
            getSlotElement,
          )
        : resolveSlotIndexFromPoint(
            ev.clientX,
            ev.clientY,
            getSourceSlots().length,
            getSlotElement,
          );
      if (targetIndex >= 0) {
        dragHoverIndex.value = targetIndex;
      }

      const from = dragSourceIndex.value;
      const to = dragHoverIndex.value;
      if (dragMoved.value && targetIndex >= 0 && to >= 0 && to !== from) {
        commitDrag();
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

  onUnmounted(() => {
    clearPointerSession();
    endDrag();
  });

  return {
    dragActive,
    dragGhostVisible,
    dragPlaceholderVisible,
    dragSourceIndex,
    dragHoverIndex,
    dragMoved,
    dragTreasure,
    dragGhostStyle,
    dragPlaceholderStyle,
    displaySlots,
    displayKeys,
    onSlotPointerDown,
  };
}
