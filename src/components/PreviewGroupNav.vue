<template>
  <nav v-if="total > 1" class="preview-group-nav" aria-label="预览翻页">
    <button
      ref="prevRef"
      type="button"
      class="preview-group-nav__side preview-group-nav__side--prev"
      aria-label="上一个"
      @click="emit('step', -1)"
    >
      <i class="ri-arrow-left-s-line" aria-hidden="true"></i>
    </button>
    <button
      ref="nextRef"
      type="button"
      class="preview-group-nav__side preview-group-nav__side--next"
      aria-label="下一个"
      @click="emit('step', 1)"
    >
      <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
    </button>
    <div class="preview-group-nav__footer">
      <span ref="progressRef" class="preview-group-nav__progress" aria-live="polite">{{
        progressLabel
      }}</span>
    </div>
  </nav>
</template>

<script setup>
import gsap from "gsap";
import { computed, onMounted, ref, watch } from "vue";
import { EASE_TRANSFORM } from "../constants.js";
import { formatPreviewNavProgress } from "../preview/previewGroupNav.js";

const props = defineProps({
  index: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
});

const emit = defineEmits(["step"]);

const prevRef = ref(null);
const nextRef = ref(null);
const progressRef = ref(null);

const progressLabel = computed(() => {
  if (props.total <= 1) return "";
  return formatPreviewNavProgress({ items: new Array(props.total), index: props.index });
});

function animTargets() {
  return [progressRef.value, prevRef.value, nextRef.value].filter(Boolean);
}

function resetVisible() {
  const targets = animTargets();
  if (!targets.length) return;
  gsap.set(targets, { opacity: 1, y: 0, clearProps: "transform" });
}

/** @param {gsap.core.Timeline} tl @param {number} [at=0] */
function appendCloseAnimation(tl, at = 0) {
  if (props.total <= 1 || !tl) return;
  const progress = progressRef.value;
  const sides = [prevRef.value, nextRef.value].filter(Boolean);
  if (progress) {
    tl.to(
      progress,
      {
        opacity: 0,
        y: 8,
        duration: 0.07,
        ease: EASE_TRANSFORM,
      },
      at,
    );
  }
  if (sides.length) {
    tl.to(
      sides,
      {
        opacity: 0,
        duration: 0.07,
        ease: EASE_TRANSFORM,
      },
      at,
    );
  }
}

function instantCloseHide() {
  const targets = animTargets();
  if (!targets.length) return;
  gsap.set(targets, { opacity: 0 });
}

/** @param {gsap.core.Timeline} tl @param {number} [at=0] */
function appendEnterAnimation(tl, at = 0) {
  if (props.total <= 1 || !tl) return;
  const targets = animTargets();
  if (!targets.length) return;
  gsap.set(targets, { opacity: 0 });
  tl.to(
    targets,
    {
      opacity: 1,
      y: 0,
      duration: 0.14,
      ease: EASE_TRANSFORM,
      clearProps: "transform",
    },
    at,
  );
}

watch(
  () => props.total,
  (n) => {
    if (n > 1) resetVisible();
  },
);

onMounted(() => {
  resetVisible();
});

defineExpose({
  appendCloseAnimation,
  appendEnterAnimation,
  instantCloseHide,
  instantEnterHide: instantCloseHide,
  resetVisible,
  getAnimTargets: animTargets,
});
</script>
