<template>
  <button
    ref="btnRef"
    type="button"
    class="word-favorite-btn"
    :class="{
      'word-favorite-btn--active': favorited,
      'word-favorite-btn--compact': size === 'compact',
    }"
    :aria-label="ariaLabel"
    :aria-pressed="favorited"
    @click="onClick"
  >
    <span class="word-favorite-btn__icon-wrap">
      <i
        ref="iconRef"
        class="word-favorite-btn__icon"
        :class="favorited ? 'ri-star-fill' : 'ri-star-line'"
        aria-hidden="true"
      />
    </span>
    <span ref="ripple1Ref" class="word-favorite-btn__ripple" aria-hidden="true" />
    <span ref="ripple2Ref" class="word-favorite-btn__ripple" aria-hidden="true" />
    <span
      v-for="spark in sparkSlots"
      :key="spark"
      :ref="(el) => setSparkRef(el, spark)"
      class="word-favorite-btn__spark"
      aria-hidden="true"
    />
  </button>
</template>

<script setup>
import { computed, ref } from "vue";
import gsap from "gsap";
import { shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";
import { isHapticsAvailable, triggerHaptic } from "../platform/haptics.js";

const props = defineProps({
  favorited: { type: Boolean, default: false },
  word: { type: String, default: "" },
  /** @type {{ type: import('vue').PropType<'default' | 'compact'>, default: 'default' }} */
  size: { type: String, default: "default" },
});

const emit = defineEmits(["toggle"]);

const btnRef = ref(null);
const iconRef = ref(null);
const ripple1Ref = ref(null);
const ripple2Ref = ref(null);

const sparkSlots = [0, 1, 2, 3];
/** @type {Map<number, HTMLElement>} */
const sparkEls = new Map();

/** @param {unknown} el @param {number} id */
function setSparkRef(el, id) {
  if (el instanceof HTMLElement) sparkEls.set(id, el);
  else sparkEls.delete(id);
}

const ariaLabel = computed(() => {
  const w = String(props.word ?? "").trim();
  if (props.favorited) {
    return w ? `取消收藏 ${w}` : "取消收藏";
  }
  return w ? `收藏 ${w}` : "收藏单词";
});

const SPARK_ANGLES = [0, 90, 180, 270];

function playButtonSquash() {
  const el = btnRef.value;
  if (!(el instanceof HTMLElement) || shouldSkipDecorativeMotion()) return;
  gsap.killTweensOf(el);
  gsap
    .timeline()
    .to(el, { scale: 0.9, duration: 0.1, ease: "sine.in" })
    .to(el, { scale: 1.05, duration: 0.18, ease: "sine.out" })
    .to(el, { scale: 1, duration: 0.14, ease: "sine.inOut" });
}

function playStarPop() {
  const icon = iconRef.value;
  if (!(icon instanceof HTMLElement) || shouldSkipDecorativeMotion()) return;
  gsap.killTweensOf(icon);
  gsap
    .timeline()
    .to(icon, {
      scale: 0.86,
      y: 1,
      duration: 0.1,
      ease: "sine.in",
      transformOrigin: "50% 58%",
    })
    .to(icon, {
      scale: 1.14,
      y: -2,
      duration: 0.22,
      ease: "sine.out",
      transformOrigin: "50% 58%",
    })
    .to(icon, {
      scale: 1,
      y: 0,
      duration: 0.18,
      ease: "sine.inOut",
      transformOrigin: "50% 58%",
    });
}

function playRipple() {
  if (shouldSkipDecorativeMotion()) return;
  [ripple1Ref.value, ripple2Ref.value].forEach((el, index) => {
    if (!(el instanceof HTMLElement)) return;
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { opacity: 0.78, scale: 0.96 },
      { opacity: 0, scale: 2.35, duration: 0.5, delay: index * 0.08, ease: "sine.out" },
    );
  });
}

function playSparks() {
  if (shouldSkipDecorativeMotion()) return;
  const btn = btnRef.value;
  const dist =
    btn instanceof HTMLElement ? Math.max(10, btn.getBoundingClientRect().width * 0.36) : 16;
  sparkSlots.forEach((id, index) => {
    const el = sparkEls.get(id);
    if (!(el instanceof HTMLElement)) return;
    const angle = SPARK_ANGLES[index] ?? 0;
    const rad = (angle * Math.PI) / 180;
    gsap.killTweensOf(el);
    gsap.set(el, { opacity: 0, scale: 0.2, x: 0, y: 0, rotation: angle });
    gsap.to(el, {
      opacity: 0,
      scale: 0.38,
      x: Math.cos(rad) * dist,
      y: Math.sin(rad) * dist - 1,
      duration: 0.34,
      delay: 0.06,
      ease: "sine.out",
      onStart: () => {
        gsap.set(el, { opacity: 0.55, scale: 0.32 });
      },
    });
  });
}

function playClickFeedback() {
  playButtonSquash();
  playStarPop();
  playRipple();
  playSparks();
}

function onClick(event) {
  event.stopPropagation();
  if (isHapticsAvailable()) triggerHaptic("tap");
  playClickFeedback();
  emit("toggle");
}
</script>

<style scoped>
.word-favorite-btn {
  flex: 0 0 auto;
  position: relative;
  width: calc(48 * var(--rpx));
  height: calc(48 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: var(--radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff8dc;
  color: #b8940f;
  cursor: pointer;
  box-shadow: var(--shadow);
  overflow: visible;
  font: inherit;
  transform-origin: center center;
}

.word-favorite-btn--compact {
  width: calc(48 * var(--rpx));
  height: calc(48 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
}

.word-favorite-btn__icon-wrap {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(calc(-1.5 * var(--rpx)));
}

.word-favorite-btn--compact .word-favorite-btn__icon-wrap {
  transform: translateY(calc(-1 * var(--rpx)));
}

.word-favorite-btn__icon {
  font-size: calc(28 * var(--rpx));
  line-height: 1;
  transition: color 0.14s ease;
  transform-origin: 50% 55%;
}

.word-favorite-btn--compact .word-favorite-btn__icon {
  font-size: calc(24 * var(--rpx));
}

.word-favorite-btn--active {
  color: #f5c518;
}

.word-favorite-btn__ripple {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0;
  background: rgba(255, 248, 210, 0.14);
  border: calc(2 * var(--rpx)) solid rgba(255, 230, 130, 0.82);
  box-shadow: 0 0 calc(10 * var(--rpx)) rgba(255, 210, 80, 0.38);
  transform-origin: center center;
}

.word-favorite-btn--compact .word-favorite-btn__ripple {
  border-width: calc(2 * var(--rpx));
}

.word-favorite-btn__spark {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 2;
  width: calc(5 * var(--rpx));
  height: calc(5 * var(--rpx));
  margin: calc(-2.5 * var(--rpx)) 0 0 calc(-2.5 * var(--rpx));
  border-radius: 50%;
  background: rgba(255, 236, 150, 0.95);
  box-shadow: 0 0 calc(5 * var(--rpx)) rgba(255, 220, 100, 0.55);
  pointer-events: none;
  opacity: 0;
  transform-origin: center center;
}

.word-favorite-btn--compact .word-favorite-btn__spark {
  width: calc(4.5 * var(--rpx));
  height: calc(4.5 * var(--rpx));
  margin: calc(-2.25 * var(--rpx)) 0 0 calc(-2.25 * var(--rpx));
}

.word-favorite-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: inherit;
  pointer-events: none;
  background: transparent;
  transition: background 0.12s ease;
}

.word-favorite-btn:hover::after {
  background: var(--overlay-hover-bright);
}

.word-favorite-btn:active::after {
  background: var(--overlay-active-dim);
}
</style>
