<template>
  <SegmentTabControl
    class="collection-icon-segment-host"
    :model-value="modelValue"
    :options="options"
    :aria-label="ariaLabel"
    variant="collection"
    fill
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

<script setup>
import SegmentTabControl from "./SegmentTabControl.vue";

defineProps({
  options: { type: Array, required: true },
  modelValue: { type: String, required: true },
  ariaLabel: { type: String, default: "收藏分类" },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<style scoped>
.collection-icon-segment-host {
  width: 100%;
}
</style>
