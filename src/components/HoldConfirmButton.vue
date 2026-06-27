<template>
  <button
    ref="btnRef"
    type="button"
    class="shop-btn hold-confirm-btn"
    :class="[
      variantClass,
      {
        'hold-confirm-btn--holding': holding,
        'hold-confirm-btn--vertical-fill': fillDirection === 'vertical',
      },
    ]"
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
      :class="{ 'hold-confirm-btn-fill--vertical': fillDirection === 'vertical' }"
      :style="fillStyle"
      aria-hidden="true"
    />
  </button>
</template>

<script setup>
import { computed, watch } from "vue";
import { useHoldConfirmInteraction } from "../composables/useHoldConfirmInteraction.js";

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
  /** 长按进度方向：confirm 为 vertical，其它被动按钮覆层用 HoldPeerProgress */
  fillDirection: {
    type: String,
    default: "vertical",
    validator: (v) => v === "horizontal" || v === "vertical",
  },
});

const emit = defineEmits(["confirm", "hold-change"]);

const {
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
} = useHoldConfirmInteraction({
  enabled: () => props.holdMode && !props.disabled,
  onConfirm: () => emit("confirm"),
  onHoldChange: (state) => emit("hold-change", state),
});

const variantClass = computed(() => {
  const v = String(props.variant ?? "buy");
  if (v === "use") return "shop-btn--use";
  return "shop-btn--buy";
});

const displayLabel = computed(() => (props.holdMode ? props.holdLabel : props.label));

const fillStyle = computed(() => {
  const ratio = fillRatio.value;
  if (props.fillDirection === "vertical") {
    return { transform: `scaleY(${ratio})` };
  }
  return { transform: `scaleX(${ratio})` };
});

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) resetHold();
  },
);
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

.hold-confirm-btn-fill--vertical {
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  width: 100%;
  transform-origin: top center;
  transform: scaleY(0);
}

.hold-confirm-btn--holding:active {
  transform: none;
}
</style>
