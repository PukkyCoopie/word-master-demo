import { computed, onMounted, onUnmounted, ref } from "vue";

const SCROLLBAR_TRACK_INSET = 4;
const SCROLLBAR_MIN_THUMB = 28;

/**
 * 与关于弹窗一致的自定义滚动条（隐藏原生条 + 右侧 track/thumb）。
 * @param {{ thumbColor?: string, contentRef?: import('vue').Ref<HTMLElement | null | undefined>, minThumbPx?: number | (() => number), trackInset?: number | (() => number), overflowThreshold?: number }} [options]
 */
export function usePanelScrollbar(options = {}) {
  const thumbColor = options.thumbColor ?? "#8a8580";
  const contentRef = options.contentRef;
  const minThumbPxOption = options.minThumbPx ?? SCROLLBAR_MIN_THUMB;
  const trackInsetOption = options.trackInset ?? SCROLLBAR_TRACK_INSET;
  const overflowThreshold = options.overflowThreshold ?? 1;

  function resolveMinThumbPx() {
    return typeof minThumbPxOption === "function"
      ? minThumbPxOption()
      : minThumbPxOption;
  }

  function resolveTrackInset() {
    return typeof trackInsetOption === "function"
      ? trackInsetOption()
      : trackInsetOption;
  }

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

  function resolveTrackInnerHeight(container) {
    const track = scrollTrackRef.value;
    const trackHeight = track instanceof HTMLElement ? track.clientHeight : container.clientHeight;
    const inset = resolveTrackInset();
    return Math.max(0, trackHeight - inset * 2);
  }

  function resolveScrollContentHeight(container) {
    const content = contentRef?.value;
    if (content instanceof HTMLElement) {
      return content.scrollHeight;
    }
    return container.scrollHeight;
  }

  function containerNeedsScroll(container) {
    const clientHeight = container.clientHeight;
    if (clientHeight <= 0) return false;
    return resolveScrollContentHeight(container) > clientHeight + overflowThreshold;
  }

  function updateScrollbarMetrics() {
    const container = scrollBodyRef.value;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const canScroll = containerNeedsScroll(container);
    scrollbarVisible.value = canScroll;

    if (!canScroll) {
      if (container.scrollTop !== 0) container.scrollTop = 0;
      thumbHeightPx.value = 0;
      thumbTopPx.value = 0;
      return;
    }

    const trackInner = resolveTrackInnerHeight(container);
    thumbHeightPx.value = Math.max(
      resolveMinThumbPx(),
      (clientHeight / scrollHeight) * trackInner,
    );

    const inset = resolveTrackInset();
    const maxThumbTop = Math.max(0, trackInner - thumbHeightPx.value);
    const scrollRange = scrollHeight - clientHeight;
    if (!thumbDragging.value) {
      const ratio = scrollRange > 0 ? scrollTop / scrollRange : 0;
      thumbTopPx.value = inset + ratio * maxThumbTop;
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

    const trackInner = resolveTrackInnerHeight(container);
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
      const { maxThumbTop, scrollRange, startScrollTop } = thumbDragState;
      if (maxThumbTop <= 0) return;

      const nextScrollTop = Math.max(
        0,
        Math.min(scrollRange, startScrollTop + (dy / maxThumbTop) * scrollRange),
      );
      container.scrollTop = nextScrollTop;

      const inset = resolveTrackInset();
      const ratio = scrollRange > 0 ? nextScrollTop / scrollRange : 0;
      thumbTopPx.value = inset + ratio * maxThumbTop;
    };

    const onUp = () => {
      thumbDragging.value = false;
      thumbDragState = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      updateScrollbarMetrics();
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
    const inset = resolveTrackInset();
    const trackInner = Math.max(0, rect.height - inset * 2);
    const maxThumbTop = Math.max(0, trackInner - thumbHeightPx.value);
    const y = event.clientY - rect.top - inset;
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
