<template>
  <span
    v-if="active"
    class="hold-peer-progress"
    :style="{ transform: `scaleX(${clampedProgress})` }"
    aria-hidden="true"
  />
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  active: { type: Boolean, default: false },
  progress: { type: Number, default: 0 },
});

const clampedProgress = computed(() => Math.max(0, Math.min(1, Number(props.progress) || 0)));
</script>
