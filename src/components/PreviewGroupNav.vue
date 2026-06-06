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
import { computed, ref } from "vue";
import { EASE_TRANSFORM } from "../constants.js";
import { formatPreviewNavProgress } from "../preview/previewGroupNav.js";

const SIDE_ENTER_OFFSET = 28;
const PROGRESS_ENTER_OFFSET = 14;

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

function sideEnterState(side) {
  return {
    opacity: 0,
    x: side === "prev" ? -SIDE_ENTER_OFFSET : SIDE_ENTER_OFFSET,
    yPercent: -50,
  };
}

function applyEnterInitialHide() {
  if (props.total <= 1) return;
  const prev = prevRef.value;
  const next = nextRef.value;
  const progress = progressRef.value;
  gsap.killTweensOf(animTargets());
  if (prev) gsap.set(prev, sideEnterState("prev"));
  if (next) gsap.set(next, sideEnterState("next"));
  if (progress) gsap.set(progress, { opacity: 0, y: PROGRESS_ENTER_OFFSET });
}

function resetVisible() {
  const prev = prevRef.value;
  const next = nextRef.value;
  const progress = progressRef.value;
  gsap.killTweensOf(animTargets());
  if (prev) gsap.set(prev, { opacity: 1, x: 0, clearProps: "transform" });
  if (next) gsap.set(next, { opacity: 1, x: 0, clearProps: "transform" });
  if (progress) gsap.set(progress, { opacity: 1, y: 0, clearProps: "transform" });
}

/** @param {gsap.core.Timeline} tl @param {number} [at=0] */
function appendCloseAnimation(tl, at = 0) {
  if (props.total <= 1 || !tl) return;
  const prev = prevRef.value;
  const next = nextRef.value;
  const progress = progressRef.value;
  if (prev) {
    tl.to(
      prev,
      {
        opacity: 0,
        x: -SIDE_ENTER_OFFSET,
        yPercent: -50,
        duration: 0.1,
        ease: EASE_TRANSFORM,
      },
      at,
    );
  }
  if (next) {
    tl.to(
      next,
      {
        opacity: 0,
        x: SIDE_ENTER_OFFSET,
        yPercent: -50,
        duration: 0.1,
        ease: EASE_TRANSFORM,
      },
      at,
    );
  }
  if (progress) {
    tl.to(
      progress,
      {
        opacity: 0,
        y: PROGRESS_ENTER_OFFSET,
        duration: 0.1,
        ease: EASE_TRANSFORM,
      },
      at,
    );
  }
}

function instantCloseHide() {
  applyEnterInitialHide();
}

/** @param {gsap.core.Timeline} tl @param {number} [at=0] */
function appendEnterAnimation(tl, at = 0) {
  if (props.total <= 1 || !tl) return;
  applyEnterInitialHide();
  const prev = prevRef.value;
  const next = nextRef.value;
  const progress = progressRef.value;
  if (prev) {
    tl.to(
      prev,
      {
        opacity: 1,
        x: 0,
        yPercent: -50,
        duration: 0.22,
        ease: EASE_TRANSFORM,
        clearProps: "transform",
      },
      at,
    );
  }
  if (next) {
    tl.to(
      next,
      {
        opacity: 1,
        x: 0,
        yPercent: -50,
        duration: 0.22,
        ease: EASE_TRANSFORM,
        clearProps: "transform",
      },
      at,
    );
  }
  if (progress) {
    tl.to(
      progress,
      {
        opacity: 1,
        y: 0,
        duration: 0.2,
        ease: EASE_TRANSFORM,
        clearProps: "transform",
      },
      at + 0.04,
    );
  }
}

defineExpose({
  appendCloseAnimation,
  appendEnterAnimation,
  applyEnterInitialHide,
  instantCloseHide,
  instantEnterHide: instantCloseHide,
  resetVisible,
  getAnimTargets: animTargets,
});
</script>
