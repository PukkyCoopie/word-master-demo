<template>
  <button
    ref="btnRef"
    type="button"
    class="shop-btn hold-confirm-btn"
    :class="[variantClass, { 'hold-confirm-btn--holding': holding }]"
    :disabled="disabled"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @pointerleave="onPointerLeave"
    @lostpointercapture="onLostPointerCapture"
  >
    <span class="hold-confirm-btn-label">{{ displayLabel }}</span>
    <span
      v-if="holdMode"
      class="hold-confirm-btn-fill"
      :style="{ transform: `scaleX(${fillRatio})` }"
      aria-hidden="true"
    />
  </button>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from "vue";

const HOLD_DURATION_MS = 600;

const props = defineProps({
  /** 常规点击文案 */
  label: { type: String, required: true },
  /** 按住确认文案 */
  holdLabel: { type: String, required: true },
  /** shop-btn 色系：buy | use */
  variant: { type: String, default: "buy" },
  disabled: { type: Boolean, default: false },
  /** 为 true 时需按住 0.6s 才触发 confirm */
  holdMode: { type: Boolean, default: false },
});

const emit = defineEmits(["confirm"]);

const btnRef = ref(null);
const holding = ref(false);
const fillRatio = ref(0);

/** @type {number | null} */
let rafId = null;
/** @type {number} */
let holdStartMs = 0;
/** @type {number | null} */
let activePointerId = null;
let completed = false;

const variantClass = computed(() => {
  const v = String(props.variant ?? "buy");
  if (v === "use") return "shop-btn--use";
  return "shop-btn--buy";
});

const displayLabel = computed(() => (props.holdMode ? props.holdLabel : props.label));

function clearRaf() {
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function resetHold() {
  clearRaf();
  holding.value = false;
  fillRatio.value = 0;
  holdStartMs = 0;
  activePointerId = null;
  completed = false;
}

function finishHold() {
  if (completed) return;
  completed = true;
  clearRaf();
  holding.value = false;
  fillRatio.value = 1;
  emit("confirm");
  resetHold();
}

function tickHold() {
  if (!holding.value || completed) return;
  const elapsed = performance.now() - holdStartMs;
  const ratio = Math.min(1, elapsed / HOLD_DURATION_MS);
  fillRatio.value = ratio;
  if (ratio >= 1) {
    finishHold();
    return;
  }
  rafId = requestAnimationFrame(tickHold);
}

/** @param {PointerEvent} e */
function onPointerDown(e) {
  if (!props.holdMode || props.disabled || completed) return;
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
  if (props.holdMode) {
    e.preventDefault();
    return;
  }
  if (props.disabled) return;
  emit("confirm");
}

onBeforeUnmount(() => {
  resetHold();
});
</script>

<style scoped>
.hold-confirm-btn {
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

.hold-confirm-btn-label {
  position: relative;
  z-index: 1;
}

.hold-confirm-btn-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  transform-origin: left center;
  transform: scaleX(0);
  background: rgba(255, 236, 200, 0.72);
  mix-blend-mode: screen;
  pointer-events: none;
  border-radius: inherit;
  will-change: transform;
}

.hold-confirm-btn--holding:active {
  transform: none;
}
</style>
