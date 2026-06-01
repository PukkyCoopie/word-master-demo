<template>
  <div
    class="settings-segment"
    role="group"
    :aria-label="ariaLabel"
    :style="segmentStyle"
  >
    <div class="settings-segment-thumb" aria-hidden="true" />
    <button
      v-for="opt in options"
      :key="opt.id"
      type="button"
      class="settings-segment-btn"
      :class="{ 'settings-segment-btn--active': modelValue === opt.id }"
      :aria-pressed="modelValue === opt.id"
      @click="onSelect(opt.id)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  options: { type: Array, required: true },
  modelValue: { type: String, required: true },
  ariaLabel: { type: String, default: "选项" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const activeIndex = computed(() => {
  const idx = props.options.findIndex((o) => o.id === props.modelValue);
  return idx >= 0 ? idx : 0;
});

const segmentStyle = computed(() => ({
  "--seg-count": String(Math.max(1, props.options.length)),
  "--seg-index": String(activeIndex.value),
  opacity: props.disabled ? 0.45 : 1,
  pointerEvents: props.disabled ? "none" : undefined,
}));

/** @param {string} id */
function onSelect(id) {
  if (props.disabled || id === props.modelValue) return;
  emit("update:modelValue", id);
}
</script>

<style scoped>
.settings-segment {
  --seg-pad: calc(4 * var(--rpx));
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  max-width: calc(320 * var(--rpx));
  gap: 0;
  padding: var(--seg-pad);
  border-radius: calc(8 * var(--rpx));
  background: rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.settings-segment-thumb {
  position: absolute;
  top: var(--seg-pad);
  bottom: var(--seg-pad);
  left: var(--seg-pad);
  width: calc((100% - 2 * var(--seg-pad)) / var(--seg-count));
  border-radius: calc(6 * var(--rpx));
  background: var(--card-bright, #f9f6f2);
  box-shadow: var(--shadow);
  pointer-events: none;
  transition: transform 0.22s var(--ease-expo-out, ease-out);
  transform: translateX(calc(var(--seg-index) * 100%));
  z-index: 0;
}

.settings-segment-btn {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
  border: none;
  padding: calc(8 * var(--rpx)) calc(6 * var(--rpx));
  font-family: inherit;
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-dark, #3c3a32);
  background: transparent;
  cursor: pointer;
  border-radius: calc(6 * var(--rpx));
  opacity: 0.72;
  transition: opacity 0.12s ease;
}

.settings-segment-btn--active {
  opacity: 1;
}

.settings-segment-btn:hover:not(.settings-segment-btn--active) {
  opacity: 0.88;
}

.settings-segment-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid #5a8fb8;
  outline-offset: calc(1 * var(--rpx));
}

:global(html.reduce-motion) .settings-segment-thumb {
  transition: none;
}
</style>
