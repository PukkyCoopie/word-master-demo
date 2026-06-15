<template>
  <div
    class="collection-icon-segment"
    role="tablist"
    :aria-label="ariaLabel"
    :style="segmentStyle"
  >
    <div class="collection-icon-segment-thumb" aria-hidden="true" />
    <button
      v-for="opt in options"
      :key="opt.id"
      type="button"
      role="tab"
      class="collection-icon-segment-btn"
      :class="{ 'collection-icon-segment-btn--active': modelValue === opt.id }"
      :aria-selected="modelValue === opt.id"
      :aria-label="opt.label"
      @click="onSelect(opt.id)"
    >
      <i :class="opt.iconClass" aria-hidden="true"></i>
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { isHapticsAvailable, triggerHaptic } from "../platform/haptics.js";

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: String, required: true },
  ariaLabel: { type: String, default: "收藏分类" },
});

const emit = defineEmits(["update:modelValue"]);

const activeIndex = computed(() => {
  const idx = props.options.findIndex((o) => o.id === props.modelValue);
  return idx >= 0 ? idx : 0;
});

const segmentStyle = computed(() => ({
  "--seg-count": String(Math.max(1, props.options.length)),
  "--seg-index": String(activeIndex.value),
}));

/** @param {string} id */
function onSelect(id) {
  if (id === props.modelValue) return;
  if (isHapticsAvailable()) triggerHaptic("tabSwitch");
  emit("update:modelValue", id);
}
</script>

<style scoped>
.collection-icon-segment {
  --seg-pad: calc(5 * var(--rpx) * 1.1);
  position: relative;
  display: flex;
  width: 100%;
  gap: 0;
  padding: var(--seg-pad);
  border-radius: calc(8 * var(--rpx));
  background: var(--collection-purple, #7b68a8);
  box-sizing: border-box;
}

.collection-icon-segment-thumb {
  position: absolute;
  top: var(--seg-pad);
  bottom: var(--seg-pad);
  left: var(--seg-pad);
  width: calc((100% - 2 * var(--seg-pad)) / var(--seg-count));
  border-radius: calc(6 * var(--rpx));
  background: var(--collection-purple-dark, #554a72);
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.18);
  pointer-events: none;
  transition: transform 0.22s var(--ease-expo-out, ease-out);
  transform: translateX(calc(var(--seg-index) * 100%));
  z-index: 0;
}

.collection-icon-segment-btn {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
  border: none;
  padding: calc(12 * var(--rpx) * 1.1) calc(4 * var(--rpx));
  font-size: calc(36 * var(--rpx) * 1.1);
  line-height: 1;
  color: var(--collection-purple-fg, #f9f6f2);
  background: transparent;
  cursor: pointer;
  border-radius: calc(6 * var(--rpx));
  opacity: 0.62;
  transition: opacity 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.collection-icon-segment-btn--active {
  opacity: 1;
}

.collection-icon-segment-btn:hover:not(.collection-icon-segment-btn--active) {
  opacity: 0.82;
}

.collection-icon-segment-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid var(--collection-purple-fg, #f9f6f2);
  outline-offset: calc(1 * var(--rpx));
}

:global(html.reduce-motion) .collection-icon-segment-thumb {
  transition: none;
}
</style>
