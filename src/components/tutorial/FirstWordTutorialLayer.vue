<template>
  <Teleport defer to="#game-view-portal-frame">
    <div
      v-if="visible"
      ref="rootRef"
      class="first-word-tutorial"
      :class="{
        'first-word-tutorial--fading': fading,
        'first-word-tutorial--bleed': borderlessLayout,
        'first-word-tutorial--blocking': phase === 'shopComplete',
      }"
      :style="rootStyle"
    >
      <svg class="first-word-tutorial__svg" :width="frameW" :height="frameH" aria-hidden="true">
        <defs>
          <mask :id="maskId">
            <rect :width="frameW" :height="frameH" fill="white" />
            <rect
              v-for="hole in displayHoles"
              :key="hole.key"
              :x="hole.x"
              :y="hole.y"
              :width="hole.width"
              :height="hole.height"
              :rx="hole.rx"
              :ry="hole.rx"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          class="first-word-tutorial__scrim"
          :width="frameW"
          :height="frameH"
          :mask="`url(#${maskId})`"
        />
      </svg>

      <div
        v-if="arrowVisible && arrowStyle"
        ref="arrowRef"
        class="first-word-tutorial__arrow"
        :style="arrowStyle"
      >
        <i class="ri-arrow-down-s-fill" aria-hidden="true"></i>
      </div>

      <div
        v-if="showHint && hintText && showContinueButton"
        ref="hintCardRef"
        class="first-word-tutorial__hint-card"
        :class="{ 'first-word-tutorial__hint-card--centered': phase === 'shopComplete' }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="hintMessageId"
      >
        <p :id="hintMessageId" class="first-word-tutorial__hint-card-message">{{ hintText }}</p>
        <button
          type="button"
          class="first-word-tutorial__hint-card-btn"
          @click="onContinueClick"
        >
          {{ continueButtonLabel }}
        </button>
      </div>

      <p
        v-else-if="showHint && hintText"
        ref="hintRef"
        class="first-word-tutorial__hint"
        :class="{ 'first-word-tutorial__hint--arrow-anchored': phase === 'shopIntro' }"
        :style="hintAnchoredStyle"
      >
        {{ hintText }}
      </p>

      <button
        v-if="skipButtonStyle"
        type="button"
        class="first-word-tutorial__skip deck-btn deck-btn--grid-row"
        :style="skipButtonStyle"
        @click="$emit('skip')"
      >
        跳过引导
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import gsap from "gsap";
import { resolveBorderlessLayout } from "../../settings/displayLayoutMode.js";
import { shouldSkipDecorativeMotion } from "../../settings/animationSpeed.js";
import { createTutorialHoleAnimator } from "../../game/tutorialSpotlightAnim.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  holes: { type: Array, default: () => [] },
  phase: { type: String, default: "select" },
  showHint: { type: Boolean, default: false },
  showContinueButton: { type: Boolean, default: false },
  hintText: { type: String, default: "" },
  continueButtonLabel: { type: String, default: "继续" },
  stackZ: { type: Number, default: 0 },
  arrowTarget: { type: Object, default: null },
  skipButtonRect: { type: Object, default: null },
});

const emit = defineEmits(["skip", "continue", "fade-complete"]);

const rootRef = ref(null);
const arrowRef = ref(null);
const hintRef = ref(null);
const hintCardRef = ref(null);
const frameW = ref(1);
const frameH = ref(1);
const fading = ref(false);
const borderlessLayout = ref(resolveBorderlessLayout());
const maskId = `first-word-tutorial-mask-${Math.random().toString(36).slice(2, 9)}`;
const hintMessageId = `first-word-tutorial-hint-${Math.random().toString(36).slice(2, 9)}`;

function onContinueClick(event) {
  event.currentTarget?.blur?.();
  emit("continue");
}

/** @type {import('vue').Ref<{ key: string, x: number, y: number, width: number, height: number, rx: number }[]>} */
const displayHoles = ref([]);

let fadeTl = null;
/** @type {ResizeObserver | null} */
let frameObserver = null;

const { syncHoles, snapHoles, dispose: disposeHoleAnimator } = createTutorialHoleAnimator(displayHoles);

const visible = computed(() => props.open || fading.value);

const rootStyle = computed(() => (props.stackZ > 0 ? { zIndex: props.stackZ } : undefined));

const hintAnchoredStyle = computed(() => {
  if (props.phase !== "shopIntro") return null;
  const t = props.arrowTarget;
  if (!t || t.width <= 0 || t.height <= 0) return null;
  const cx = t.x + t.width / 2;
  const arrowTop = Math.max(0, t.y - 8);
  return {
    left: `${cx}px`,
    top: `${arrowTop}px`,
    transform: "translate(-50%, calc(-100% - 52 * var(--rpx)))",
  };
});

const arrowVisible = computed(() => {
  if (props.phase === "retry" || props.phase === "shopIntro") return !!props.arrowTarget;
  return props.phase === "select" || props.phase === "submit" || props.phase === "scoreIntro";
});

const arrowStyle = computed(() => {
  const t = props.arrowTarget;
  if (!t || t.width <= 0 || t.height <= 0) return null;
  const cx = t.x + t.width / 2;
  const top = Math.max(0, t.y - 8);
  return {
    left: `${cx}px`,
    top: `${top}px`,
  };
});

const skipButtonStyle = computed(() => {
  const r = props.skipButtonRect;
  if (!r || r.width <= 0 || r.height <= 0) return null;
  return {
    left: `${r.x}px`,
    top: `${r.y}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
  };
});

function measureFrame() {
  borderlessLayout.value = resolveBorderlessLayout();
  const frame = document.getElementById("game-view-portal-frame");
  if (!frame) return;
  const rect = frame.getBoundingClientRect();
  frameW.value = Math.max(1, rect.width);
  frameH.value = Math.max(1, rect.height);
}

function bindFrameObserver() {
  const frame = document.getElementById("game-view-portal-frame");
  if (!frame || frameObserver) return;
  frameObserver = new ResizeObserver(() => {
    measureFrame();
  });
  frameObserver.observe(frame);
  window.addEventListener("resize", measureFrame);
}

function unbindFrameObserver() {
  frameObserver?.disconnect();
  frameObserver = null;
  window.removeEventListener("resize", measureFrame);
}

watch(
  () => props.holes,
  (holes) => {
    if (!props.open && !fading.value) {
      snapHoles(holes);
      return;
    }
    syncHoles(holes);
    nextTick(measureFrame);
  },
  { deep: true },
);

watch(
  () => props.open,
  (open) => {
    if (open) {
      syncHoles(props.holes);
      nextTick(() => {
        measureFrame();
        const el = rootRef.value;
        if (el) gsap.set(el, { opacity: 1 });
        scheduleHintEnter();
      });
    } else if (!fading.value) {
      snapHoles([]);
    }
  },
);

function playHintEnter(el) {
  if (!el) return;
  if (shouldSkipDecorativeMotion()) {
    gsap.set(el, { opacity: 1, scale: 1 });
    return;
  }
  gsap.fromTo(
    el,
    { opacity: 0, scale: 0.94 },
    { opacity: 1, scale: 1, duration: 0.32, ease: "expo.out", overwrite: "auto" },
  );
}

function scheduleHintEnter() {
  if (!props.showHint || !props.hintText) return;
  nextTick(() => {
    if (props.showContinueButton) {
      playHintEnter(hintCardRef.value);
    } else {
      playHintEnter(hintRef.value);
    }
  });
}

watch(
  () => [props.showHint, props.hintText, props.showContinueButton],
  () => {
    scheduleHintEnter();
  },
);

watch(
  () => props.arrowTarget,
  () => {
    const el = arrowRef.value;
    if (!el || !props.open) return;
    if (shouldSkipDecorativeMotion()) {
      gsap.set(el, { y: 0, opacity: 1 });
      return;
    }
    gsap.fromTo(
      el,
      { y: -6, opacity: 0.85 },
      { y: 0, opacity: 1, duration: 0.28, ease: "back.out(2)", overwrite: "auto" },
    );
  },
  { deep: true },
);

onMounted(() => {
  bindFrameObserver();
  measureFrame();
});

onBeforeUnmount(() => {
  unbindFrameObserver();
  disposeHoleAnimator();
  if (fadeTl) {
    fadeTl.kill();
    fadeTl = null;
  }
});

defineExpose({
  /** @returns {Promise<void>} */
  fadeOutAndWait() {
    return new Promise((resolve) => {
      const el = rootRef.value;
      if (!el) {
        resolve();
        return;
      }
      fading.value = true;
      if (fadeTl) fadeTl.kill();
      fadeTl = gsap.to(el, {
        opacity: 0,
        duration: 0.45,
        ease: "power1.out",
        onComplete: () => {
          fading.value = false;
          fadeTl = null;
          snapHoles([]);
          emit("fade-complete");
          resolve();
        },
      });
    });
  },
});
</script>

<style scoped>
.first-word-tutorial {
  position: absolute;
  inset: 0;
  z-index: 290;
  pointer-events: none;
  opacity: 1;
}

.first-word-tutorial--bleed {
  box-shadow: 0 0 0 100vmax var(--tutorial-scrim, rgba(0, 0, 0, 0.55));
}

.first-word-tutorial--blocking {
  pointer-events: auto;
}

.first-word-tutorial--blocking .first-word-tutorial__svg {
  pointer-events: auto;
}

.first-word-tutorial__svg {
  position: absolute;
  inset: 0;
  display: block;
  pointer-events: none;
}

.first-word-tutorial__scrim {
  fill: var(--tutorial-scrim, rgba(0, 0, 0, 0.55));
}

.first-word-tutorial__arrow {
  position: absolute;
  transform: translate(-50%, -100%);
  color: #fff;
  font-size: calc(44 * var(--rpx));
  line-height: 1;
  filter: drop-shadow(0 calc(2 * var(--rpx)) calc(6 * var(--rpx)) rgba(0, 0, 0, 0.35));
  pointer-events: none;
  z-index: 2;
  animation: first-word-tutorial-arrow-bob 1.1s ease-in-out infinite;
}

@keyframes first-word-tutorial-arrow-bob {
  0%,
  100% {
    transform: translate(-50%, -100%) translateY(0);
  }
  50% {
    transform: translate(-50%, -100%) translateY(calc(6 * var(--rpx)));
  }
}

.first-word-tutorial__hint--arrow-anchored {
  left: auto;
  top: auto;
  transform: none;
  max-width: calc(520 * var(--rpx));
  white-space: nowrap;
}

/* 设计稿 750×1500：result-area 下缘 ≈422rpx，词槽上缘 ≈572rpx，中带垂直居中 ≈497rpx */
.first-word-tutorial__hint {
  position: absolute;
  left: 50%;
  top: calc(497 * var(--rpx));
  transform: translate(-50%, -50%);
  margin: 0;
  padding: calc(10 * var(--rpx)) calc(22 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: rgba(255, 255, 255, 0.96);
  color: #3a3a3a;
  font-size: calc(28 * var(--rpx));
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  box-shadow: 0 calc(4 * var(--rpx)) calc(16 * var(--rpx)) rgba(0, 0, 0, 0.12);
  pointer-events: none;
  z-index: 2;
  max-width: 86%;
}

.first-word-tutorial__hint-card {
  position: absolute;
  left: 50%;
  top: calc(497 * var(--rpx));
  transform: translate(-50%, -50%);
  width: calc(680 * var(--rpx));
  max-width: 86%;
  margin: 0;
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(28 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card-bright);
  box-shadow: var(--shadow);
  box-sizing: border-box;
  pointer-events: auto;
  z-index: 3;
}

.first-word-tutorial__hint-card-message {
  margin: 0 0 calc(28 * var(--rpx));
  font-size: calc(30 * var(--rpx));
  font-weight: 600;
  line-height: 1.45;
  color: var(--text-muted, #5a5a5a);
  text-align: center;
}

.first-word-tutorial__hint-card-btn {
  display: block;
  width: 100%;
  min-height: calc(88 * var(--rpx));
  margin: 0;
  border: none;
  border-radius: calc(12 * var(--rpx));
  background: #6a9e5c;
  color: #fff;
  font-family: inherit;
  font-size: calc(32 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
}

.first-word-tutorial__hint-card-btn:hover {
  filter: brightness(1.05);
}

.first-word-tutorial__hint-card-btn:active {
  filter: brightness(0.92);
}

.first-word-tutorial__hint-card--centered {
  top: 50%;
  width: calc(620 * var(--rpx));
}

.first-word-tutorial__skip {
  position: absolute;
  margin: 0;
  box-sizing: border-box;
  pointer-events: auto;
  z-index: 3;
}

.first-word-tutorial__skip:active {
  transform: none;
}

.first-word-tutorial--fading {
  pointer-events: none;
}
</style>
