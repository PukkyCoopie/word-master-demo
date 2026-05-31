<template>
  <span
    class="difficulty-pill"
    :style="pillStyle"
  >
    {{ displayLabel }}
  </span>
</template>

<script setup>
import { computed } from "vue";
import { getRunDifficultyDef, normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";

const props = defineProps({
  index: { type: Number, default: 0 },
  label: { type: String, default: "" },
});

const def = computed(() => getRunDifficultyDef(props.index));

const displayLabel = computed(() => {
  const custom = String(props.label ?? "").trim();
  if (custom) return custom;
  return def.value.label;
});

const pillStyle = computed(() => ({
  backgroundColor: def.value.color,
  color: def.value.textColor,
}));
</script>

<style scoped>
.difficulty-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: calc(2 * var(--rpx)) calc(10 * var(--rpx));
  border-radius: calc(999 * var(--rpx));
  font-size: calc(18 * var(--rpx));
  font-weight: 700;
  line-height: 1.2;
  box-shadow: var(--shadow, 0 calc(2 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.12));
}
</style>
