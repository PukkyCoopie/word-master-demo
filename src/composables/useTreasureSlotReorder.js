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
function rectStyleInContainer(rect, containerRect) {
  return {
    left: `${rect.left - containerRect.left}px`,
    top: `${rect.top - containerRect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
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
 */
export function useTreasureSlotReorder(options) {
  const {
    getSourceSlots,
    keyOrder,
    canDrag = () => true,
    onCommit,
    getSlotElement = () => null,
    getOverlayContainer = () => null,
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
    if (!dragActive.value) return keyOrder.value;
    return buildDragPreviewKeys(keyOrder.value, dragSourceIndex.value, dragHoverIndex.value);
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

  function updatePlaceholderPosition(index) {
    const measured = measureSlotInContainer(index);
    if (!measured) return;
    dragPlaceholderStyle.value = {
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
      const targetIndex = resolveSlotIndexFromPoint(
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

      const targetIndex = resolveSlotIndexFromPoint(
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
