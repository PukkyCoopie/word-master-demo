import { computed, onMounted, onUnmounted, ref } from "vue";

const SCROLLBAR_TRACK_INSET = 4;
const SCROLLBAR_MIN_THUMB = 28;

/**
 * 与关于弹窗一致的自定义滚动条（隐藏原生条 + 右侧 track/thumb）。
 * @param {{ thumbColor?: string, contentRef?: import('vue').Ref<HTMLElement | null | undefined> }} [options]
 */
export function usePanelScrollbar(options = {}) {
  const thumbColor = options.thumbColor ?? "#8a8580";
  const contentRef = options.contentRef;

  const scrollBodyRef = ref(null);
  const scrollTrackRef = ref(null);
  const scrollbarVisible = ref(false);
  const thumbDragging = ref(false);
  const thumbHeightPx = ref(0);
  const thumbTopPx = ref(0);

  /** @type {{ startY: number, startScrollTop: number, maxThumbTop: number, scrollRange: number } | null} */
  let thumbDragState = null;
  /** @type {ResizeObserver | null} */
  let resizeObserver = null;

  const thumbStyle = computed(() => ({
    height: `${thumbHeightPx.value}px`,
    transform: `translateY(${thumbTopPx.value}px)`,
    background: thumbColor,
  }));

  function updateScrollbarMetrics() {
    const container = scrollBodyRef.value;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const canScroll = scrollHeight > clientHeight + 1;
    scrollbarVisible.value = canScroll;

    if (!canScroll) {
      thumbHeightPx.value = 0;
      thumbTopPx.value = 0;
      return;
    }

    const trackInner = Math.max(0, clientHeight - SCROLLBAR_TRACK_INSET * 2);
    thumbHeightPx.value = Math.max(
      SCROLLBAR_MIN_THUMB,
      (clientHeight / scrollHeight) * trackInner,
    );

    const maxThumbTop = Math.max(0, trackInner - thumbHeightPx.value);
    const scrollRange = scrollHeight - clientHeight;
    if (!thumbDragging.value) {
      const ratio = scrollRange > 0 ? scrollTop / scrollRange : 0;
      thumbTopPx.value = SCROLLBAR_TRACK_INSET + ratio * maxThumbTop;
    }
  }

  function onScrollBody() {
    updateScrollbarMetrics();
  }

  /** @param {PointerEvent} event */
  function onThumbPointerDown(event) {
    const container = scrollBodyRef.value;
    const track = scrollTrackRef.value;
    if (!container || !track) return;

    const trackInner = Math.max(0, track.clientHeight - SCROLLBAR_TRACK_INSET * 2);
    const maxThumbTop = Math.max(0, trackInner - thumbHeightPx.value);
    const scrollRange = container.scrollHeight - container.clientHeight;

    thumbDragState = {
      startY: event.clientY,
      startScrollTop: container.scrollTop,
      maxThumbTop,
      scrollRange,
    };
    thumbDragging.value = true;

    /** @param {PointerEvent} moveEvent */
    const onMove = (moveEvent) => {
      if (!thumbDragState || !container) return;
      const dy = moveEvent.clientY - thumbDragState.startY;
      const thumbTravel = thumbDragState.maxThumbTop;
      const scrollDelta =
        thumbTravel > 0 ? (dy / thumbTravel) * thumbDragState.scrollRange : 0;
      container.scrollTop = thumbDragState.startScrollTop + scrollDelta;
      updateScrollbarMetrics();
    };

    const onUp = () => {
      thumbDragging.value = false;
      thumbDragState = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    event.preventDefault();
  }

  /** @param {PointerEvent} event */
  function onTrackPointerDown(event) {
    if (event.target !== scrollTrackRef.value) return;

    const container = scrollBodyRef.value;
    const track = scrollTrackRef.value;
    if (!container || !track) return;

    const rect = track.getBoundingClientRect();
    const trackInner = Math.max(0, rect.height - SCROLLBAR_TRACK_INSET * 2);
    const maxThumbTop = Math.max(0, trackInner - thumbHeightPx.value);
    const y = event.clientY - rect.top - SCROLLBAR_TRACK_INSET;
    const targetTop = Math.max(0, Math.min(maxThumbTop, y - thumbHeightPx.value / 2));
    const scrollRange = container.scrollHeight - container.clientHeight;

    if (maxThumbTop > 0 && scrollRange > 0) {
      container.scrollTop = (targetTop / maxThumbTop) * scrollRange;
    }
    updateScrollbarMetrics();
  }

  function bindResizeObserver() {
    const container = scrollBodyRef.value;
    if (!container || typeof ResizeObserver === "undefined") return;
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => updateScrollbarMetrics());
    resizeObserver.observe(container);
    const content = contentRef?.value;
    if (content instanceof HTMLElement) resizeObserver.observe(content);
  }

  onMounted(() => {
    bindResizeObserver();
    updateScrollbarMetrics();
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  return {
    scrollBodyRef,
    scrollTrackRef,
    scrollbarVisible,
    thumbDragging,
    thumbStyle,
    onScrollBody,
    onThumbPointerDown,
    onTrackPointerDown,
    updateScrollbarMetrics,
    bindResizeObserver,
  };
}
