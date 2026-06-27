<template>
  <SegmentTabControl
    :model-value="modelValue"
    :options="options"
    :aria-label="ariaLabel"
    :disabled="disabled"
    variant="neutral"
    role="group"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup>
import SegmentTabControl from "./SegmentTabControl.vue";

defineProps({
  options: { type: Array, required: true },
  modelValue: { type: String, required: true },
  ariaLabel: { type: String, default: "选项" },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);
</script>
