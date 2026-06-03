<template>
  <nav v-if="total > 1" class="preview-group-nav" aria-label="预览翻页">
    <button
      type="button"
      class="preview-group-nav__side preview-group-nav__side--prev"
      aria-label="上一个"
      @click="emit('step', -1)"
    >
      <i class="ri-arrow-left-s-line" aria-hidden="true"></i>
    </button>
    <button
      type="button"
      class="preview-group-nav__side preview-group-nav__side--next"
      aria-label="下一个"
      @click="emit('step', 1)"
    >
      <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
    </button>
    <div class="preview-group-nav__footer">
      <span class="preview-group-nav__progress" aria-live="polite">{{ progressLabel }}</span>
    </div>
  </nav>
</template>

<script setup>
import { computed } from "vue";
import { formatPreviewNavProgress } from "../preview/previewGroupNav.js";

const props = defineProps({
  index: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const emit = defineEmits(["step"]);

const progressLabel = computed(() => {
  if (props.total <= 1) return "";
  return formatPreviewNavProgress({ items: new Array(props.total), index: props.index });
});
</script>
