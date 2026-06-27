<template>
  <button
    type="button"
    class="settings-toggle"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="onToggle"
  >
    <span class="settings-toggle-track" :class="{ 'settings-toggle-track--on': modelValue }">
      <span class="settings-toggle-thumb" />
    </span>
  </button>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

function onToggle() {
  if (props.disabled) return;
  emit("update:modelValue", !props.modelValue);
}
</script>

<style scoped>
.settings-toggle {
  flex-shrink: 0;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.settings-toggle:disabled {
  cursor: default;
  opacity: 0.45;
}

.settings-toggle-track {
  display: block;
  position: relative;
  width: calc(56 * var(--rpx));
  height: calc(32 * var(--rpx));
  border-radius: calc(16 * var(--rpx));
  background: rgba(0, 0, 0, 0.14);
  transition: background 0.16s ease;
}

.settings-toggle-track--on {
  background: #5a8fb8;
}

.settings-toggle-thumb {
  position: absolute;
  top: calc(4 * var(--rpx));
  left: calc(4 * var(--rpx));
  width: calc(24 * var(--rpx));
  height: calc(24 * var(--rpx));
  border-radius: 50%;
  background: #f9f6f2;
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.18);
  transition: transform 0.16s ease;
}

.settings-toggle-track--on .settings-toggle-thumb {
  transform: translateX(calc(24 * var(--rpx)));
}

:global(html.reduce-motion) .settings-toggle-track,
:global(html.reduce-motion) .settings-toggle-thumb {
  transition: none;
}
</style>
