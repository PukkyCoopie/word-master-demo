import { onBeforeUnmount, ref, unref, watch } from "vue";

export const HOLD_CONFIRM_DURATION_MS = 600;

/**
 * 危险操作长按确认（提交 / 法术确定等）。
 * @param {{
 *   enabled: import('vue').MaybeRefOrGetter<boolean>,
 *   onConfirm: () => void,
 *   onHoldChange?: (state: { holding: boolean, progress: number }) => void,
 * }} options
 */
export function useHoldConfirmInteraction(options) {
  const holding = ref(false);
  const fillRatio = ref(0);

  /** @type {import('vue').Ref<HTMLElement | null>} */
  const btnRef = ref(null);

  /** @type {number | null} */
  let rafId = null;
  /** @type {number} */
  let holdStartMs = 0;
  /** @type {number | null} */
  let activePointerId = null;
  let completed = false;

  function isEnabled() {
    return Boolean(typeof options.enabled === "function" ? options.enabled() : unref(options.enabled));
  }

  function emitHoldChange() {
    options.onHoldChange?.({ holding: holding.value, progress: fillRatio.value });
  }

  function clearRaf() {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function resetHold() {
    const wasHolding = holding.value;
    clearRaf();
    holding.value = false;
    fillRatio.value = 0;
    holdStartMs = 0;
    activePointerId = null;
    completed = false;
    if (wasHolding) emitHoldChange();
  }

  function finishHold() {
    if (completed) return;
    completed = true;
    clearRaf();
    holding.value = false;
    fillRatio.value = 1;
    emitHoldChange();
    options.onConfirm();
    resetHold();
  }

  function tickHold() {
    if (!holding.value || completed) return;
    const elapsed = performance.now() - holdStartMs;
    const ratio = Math.min(1, elapsed / HOLD_CONFIRM_DURATION_MS);
    fillRatio.value = ratio;
    emitHoldChange();
    if (ratio >= 1) {
      finishHold();
      return;
    }
    rafId = requestAnimationFrame(tickHold);
  }

  /** @param {PointerEvent} e */
  function onPointerDown(e) {
    if (!isEnabled() || completed) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    const el = btnRef.value;
    if (el instanceof HTMLElement) {
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    activePointerId = e.pointerId;
    holding.value = true;
    holdStartMs = performance.now();
    fillRatio.value = 0;
    clearRaf();
    emitHoldChange();
    rafId = requestAnimationFrame(tickHold);
  }

  function cancelHold() {
    if (!holding.value || completed) return;
    resetHold();
  }

  /** @param {PointerEvent} e */
  function onPointerUp(e) {
    if (activePointerId != null && e.pointerId !== activePointerId) return;
    cancelHold();
  }

  /** @param {PointerEvent} e */
  function onPointerCancel(e) {
    if (activePointerId != null && e.pointerId !== activePointerId) return;
    cancelHold();
  }

  /** @param {PointerEvent} e */
  function onPointerLeave(e) {
    if (activePointerId != null && e.pointerId !== activePointerId) return;
    cancelHold();
  }

  /** @param {PointerEvent} e */
  function onLostPointerCapture(e) {
    if (activePointerId != null && e.pointerId !== activePointerId) return;
    cancelHold();
  }

  /** @param {MouseEvent} e */
  function onClick(e) {
    if (isEnabled()) {
      e.preventDefault();
      return;
    }
    options.onConfirm();
  }

  watch(
    () => isEnabled(),
    (enabled) => {
      if (!enabled) resetHold();
    },
  );

  onBeforeUnmount(() => {
    resetHold();
  });

  return {
    btnRef,
    holding,
    fillRatio,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onLostPointerCapture,
    onClick,
    resetHold,
  };
}
