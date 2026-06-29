<template>
  <button
    ref="btnRef"
    type="button"
    class="shop-btn"
    :class="[variantClass, { 'hold-peer-btn--holding': progressActive }]"
    :disabled="disabled"
    :title="title"
    @click="onClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @pointerleave="onPointerLeave"
    @lostpointercapture="onLostPointerCapture"
  >
    <span class="hold-peer-btn-label">{{ displayLabel }}</span>
    <HoldPeerProgress v-if="holdMode || peerHoldActive" :active="progressActive" :progress="progressValue" />
  </button>
</template>

<script setup>
import { computed } from "vue";
import { useHoldConfirmInteraction } from "../composables/useHoldConfirmInteraction.js";
import HoldPeerProgress from "./HoldPeerProgress.vue";

const props = defineProps({
  label: { type: String, default: "跳过" },
  holdLabel: { type: String, default: "按住以跳过" },
  /** 为 true 时需长按才触发 skip */
  holdMode: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  title: { type: String, default: "" },
  /** shop-btn--reroll | shop-btn--next | shop-btn--danger */
  variant: {
    type: String,
    default: "reroll",
    validator: (v) => v === "reroll" || v === "next" || v === "danger",
  },
  /** 主确认钮长按时，被动钮同步展示进度（如法术确定 ↔ 跳过） */
  peerHoldActive: { type: Boolean, default: false },
  peerHoldProgress: { type: Number, default: 0 },
});

const emit = defineEmits(["skip"]);

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
} = useHoldConfirmInteraction({
  enabled: () => props.holdMode && !props.disabled,
  onConfirm: () => emit("skip"),
});

const variantClass = computed(() => {
  if (props.variant === "next") return "shop-btn--next";
  if (props.variant === "danger") return "shop-btn--danger";
  return "shop-btn--reroll";
});

const displayLabel = computed(() => (props.holdMode ? props.holdLabel : props.label));

const progressActive = computed(() => holding.value || props.peerHoldActive);

const progressValue = computed(() =>
  holding.value ? fillRatio.value : Math.max(0, Math.min(1, Number(props.peerHoldProgress) || 0)),
);
</script>
