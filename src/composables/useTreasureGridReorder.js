import { computed, nextTick, onUnmounted, ref, shallowRef } from "vue";
import gsap from "gsap";
import {
  buildDragPreviewKeys,
  buildDragPreviewSlots,
  buildTreasureDragGhostStyle,
  captureGridLayoutRects,
  reorderArrayItem,
  rectStyleInContainer,
  resolveStableGridInsertIndex,
  TREASURE_SLOT_DRAG_THRESHOLD_PX,
} from "./useTreasureSlotReorder.js";
import { createDragEdgeAutoScrollLoop } from "../game/dragEdgeAutoScroll.js";

const SETTLE_GHOST_DURATION = 0.22;
const INSERT_HYSTERESIS_PX = 10;

/**
 * 宝藏全览弹窗：grid 拖动重排 + 拖动中挤开预览 + 松手 ghost 飞入落位。
 *
 * @param {object} options
 * @param {() => readonly (object | null)[]} options.getSourceSlots
 * @param {import("vue").Ref<string[]>} options.keyOrder
 * @param {() => boolean} [options.canDrag]
 * @param {(preview: (object | null)[]) => void} options.onCommit
 * @param {(index: number) => HTMLElement | null | undefined} [options.getSlotElement]
 * @param {() => HTMLElement | null | undefined} [options.getOverlayContainer]
 * @param {() => HTMLElement | null | undefined} [options.getScrollContainer]
 * @param {() => void} [options.onAutoScroll]
 */
export function useTreasureGridReorder(options) {
  const {
    getSourceSlots,
    keyOrder,
    canDrag = () => true,
    onCommit,
    getSlotElement = () => null,
    getOverlayContainer = () => null,
    getScrollContainer = () => null,
    onAutoScroll = () => {},
  } = options;

  const dragActive = ref(false);
  const dragSettling = ref(false);
  const dragSourceIndex = ref(-1);
  const dragInsertIndex = ref(-1);
  const settleTargetIndex = ref(-1);
  const dragMoved = ref(false);
  const dragTreasure = shallowRef(/** @type {object | null} */ (null));

  /** @type {import("vue").Ref<Record<string, string>>} */
  const dragGhostStyle = ref({});
  /** @type {import("vue").Ref<Record<string, string>>} */
  const dragPlaceholderStyle = ref({});

  const dragGhostVisible = computed(
    () => (dragActive.value || dragSettling.value) && dragTreasure.value != null,
  );
  const dragPlaceholderVisible = computed(
    () =>
      dragActive.value
      && dragTreasure.value != null
      && dragSourceIndex.value >= 0
      && dragInsertIndex.value >= 0
      && dragInsertIndex.value !== dragSourceIndex.value,
  );

  const displaySlots = computed(() => {
    const slots = getSourceSlots();
    if (dragSettling.value) {
      return slots.map((item, i) =>
        i === settleTargetIndex.value ? null : item,
      );
    }
    if (!dragActive.value || dragSourceIndex.value < 0) return slots;
    return buildDragPreviewSlots(
      slots,
      dragSourceIndex.value,
      dragInsertIndex.value,
    );
  });

  const displayKeys = computed(() => {
    const keys = Array.isArray(keyOrder?.value) ? keyOrder.value : [];
    if (dragSettling.value) return keys;
    if (!dragActive.value || dragSourceIndex.value < 0) return keys;
    return buildDragPreviewKeys(
      keys,
      dragSourceIndex.value,
      dragInsertIndex.value,
    );
  });

  /** @type {{ cleanup: (() => void) | null, pointerId: number | null, slotEl: HTMLElement | null }} */
  let pointerSession = { cleanup: null, pointerId: null, slotEl: null };
  /** @type {{ x: number, y: number, w: number, h: number } | null} */
  let ghostOffset = null;
  /** @type {Map<number, DOMRect> | null} */
  let layoutRectCache = null;
  const insertHysteresis = { insert: -1 };
  /** @type {{ x: number, y: number }} */
  let lastDragPointer = { x: 0, y: 0 };
  const edgeAutoScroll = createDragEdgeAutoScrollLoop({
    getContainer: getScrollContainer,
    onStep: () => {
      refreshDragLayoutFromPointer();
      onAutoScroll();
    },
  });

  function refreshLayoutRectCache() {
    layoutRectCache = captureGridLayoutRects(getSourceSlots().length, getSlotElement);
  }

  function refreshDragLayoutFromPointer() {
    if (!dragActive.value || dragSettling.value) return;
    refreshLayoutRectCache();
    updateGhostPosition(lastDragPointer.x, lastDragPointer.y);
    const targetIndex = resolveInsertIndex(
      lastDragPointer.x,
      lastDragPointer.y,
      getSourceSlots().length,
    );
    if (targetIndex < 0) return;
    if (targetIndex !== dragInsertIndex.value) {
      setInsertIndex(targetIndex);
      return;
    }
    if (targetIndex !== dragSourceIndex.value) {
      updatePlaceholderPosition(targetIndex);
    }
  }

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
    dragGhostStyle.value = buildTreasureDragGhostStyle(
      clientX,
      clientY,
      ghostOffset,
      container,
    );
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
    if (dragActive.value && !dragSettling.value) {
      updatePlaceholderPosition(index);
    }
  }

  /**
   * @param {number} clientX
   * @param {number} clientY
   * @param {number} slotCount
   */
  function resolveInsertIndex(clientX, clientY, slotCount) {
    return resolveStableGridInsertIndex(
      clientX,
      clientY,
      slotCount,
      layoutRectCache,
      insertHysteresis,
      INSERT_HYSTERESIS_PX,
    );
  }

  function setInsertIndex(index) {
    if (!dragActive.value || dragSettling.value) return;
    if (index < 0) return;
    const slots = getSourceSlots();
    const max = slots.length - 1;
    if (index > max) return;
    if (index === dragInsertIndex.value) return;
    dragInsertIndex.value = index;
    if (index === dragSourceIndex.value) {
      dragPlaceholderStyle.value = {};
      return;
    }
    void syncPlaceholderAfterLayout(index);
  }

  function beginDrag(slotIndex, clientX, clientY, slotEl) {
    const slots = getSourceSlots();
    const treasure = slots[slotIndex];
    if (!treasure) return;

    layoutRectCache = captureGridLayoutRects(slots.length, getSlotElement);
    insertHysteresis.insert = slotIndex;
    lastDragPointer = { x: clientX, y: clientY };

    const rect = slotEl.getBoundingClientRect();
    ghostOffset = {
      x: clientX - rect.left,
      y: clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };

    dragActive.value = true;
    dragSettling.value = false;
    dragSourceIndex.value = slotIndex;
    dragInsertIndex.value = slotIndex;
    settleTargetIndex.value = -1;
    dragTreasure.value = treasure;
    updateGhostPosition(clientX, clientY);
    dragPlaceholderStyle.value = {};
  }

  /**
   * @param {number} targetIndex
   * @param {number} clientX
   * @param {number} clientY
   */
  async function animateGhostToSlot(targetIndex, clientX, clientY) {
    updateGhostPosition(clientX, clientY);
    await nextTick();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const measured = measureSlotInContainer(targetIndex);
    if (!measured) return;

    const targetStyle = {
      position: "absolute",
      ...rectStyleInContainer(measured.slotRect, measured.containerRect),
      width: `${ghostOffset?.w ?? measured.slotRect.width}px`,
      height: `${ghostOffset?.h ?? measured.slotRect.height}px`,
      zIndex: "320",
      pointerEvents: "none",
      transition: "none",
    };

    gsap.killTweensOf(dragGhostStyle.value);
    await gsap.to(dragGhostStyle.value, {
      left: targetStyle.left,
      top: targetStyle.top,
      duration: SETTLE_GHOST_DURATION,
      ease: "power2.out",
      overwrite: true,
    });
  }

  function resetDragState() {
    dragActive.value = false;
    dragSettling.value = false;
    dragSourceIndex.value = -1;
    dragInsertIndex.value = -1;
    settleTargetIndex.value = -1;
    dragTreasure.value = null;
    dragGhostStyle.value = {};
    dragPlaceholderStyle.value = {};
    ghostOffset = null;
    layoutRectCache = null;
    insertHysteresis.insert = -1;
    edgeAutoScroll.stop();
    gsap.killTweensOf(dragGhostStyle.value);
    setTimeout(() => {
      dragMoved.value = false;
    }, 0);
  }

  /** @param {number} slotIndex @param {PointerEvent} e */
  function onSlotPointerDown(slotIndex, e) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (!canDrag()) return;
    if (dragActive.value || dragSettling.value) resetDragState();

    const slots = getSourceSlots();
    if (!slots[slotIndex]) return;

    const slotEl = e.currentTarget instanceof Element ? e.currentTarget : null;
    if (!(slotEl instanceof HTMLElement)) return;

    const cellEl = getSlotElement(slotIndex);
    if (!(cellEl instanceof HTMLElement)) return;

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
        beginDrag(slotIndex, ev.clientX, ev.clientY, cellEl);
      }
      ev.preventDefault();
      lastDragPointer = { x: ev.clientX, y: ev.clientY };
      updateGhostPosition(ev.clientX, ev.clientY);
      edgeAutoScroll.notifyPointerMove(ev.clientY);
      const targetIndex = resolveInsertIndex(
        ev.clientX,
        ev.clientY,
        getSourceSlots().length,
      );
      setInsertIndex(targetIndex);
    };

    /** @param {PointerEvent} ev */
    const onUp = async (ev) => {
      if (ev.pointerId !== pointerId) return;
      clearPointerSession();
      if (!dragging) return;

      ev.preventDefault();
      dragging = false;
      edgeAutoScroll.stop();

      const targetIndex = resolveInsertIndex(
        ev.clientX,
        ev.clientY,
        getSourceSlots().length,
      );
      if (targetIndex >= 0) dragInsertIndex.value = targetIndex;

      const from = dragSourceIndex.value;
      const to = dragInsertIndex.value;

      if (dragMoved.value && from >= 0 && to >= 0 && to !== from) {
        dragInsertIndex.value = to;
        await nextTick();
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const nextSlots = reorderArrayItem(getSourceSlots(), from, to);
        const nextKeys = reorderArrayItem(keyOrder.value, from, to);
        keyOrder.value = nextKeys;
        onCommit(nextSlots);

        dragActive.value = false;
        dragSettling.value = true;
        settleTargetIndex.value = to;

        await nextTick();
        await new Promise((resolve) => requestAnimationFrame(resolve));
        await animateGhostToSlot(to, ev.clientX, ev.clientY);
      }

      resetDragState();
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
    edgeAutoScroll.stop();
    resetDragState();
  });

  return {
    dragActive,
    dragSettling,
    dragInsertIndex,
    dragGhostVisible,
    dragPlaceholderVisible,
    dragSourceIndex,
    dragMoved,
    dragTreasure,
    dragGhostStyle,
    dragPlaceholderStyle,
    displaySlots,
    displayKeys,
    onSlotPointerDown,
  };
}
