<script setup>
import { computed, ref, watch, watchEffect } from "vue";
import gsap from "gsap";
import { bumpOverlayZ, getOverlayStackTop } from "../game/overlayStack.js";
import { getAchievementIconUrl } from "../achievements/achievementDefinitions.js";
import { animSleep, shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

const props = defineProps({
  queue: { type: Object, required: true },
});

const backdropRef = ref(null);
const contentRef = ref(null);
const stackZ = ref(0);

const stackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

watch(
  () => props.queue.playing.value,
  (playing) => {
    stackZ.value = playing ? bumpOverlayZ() : 0;
  },
);

/** 结算 / 整局结束等层打开时会 bump 栈顶，播放期间保持 Toast 在其上方 */
watchEffect(() => {
  if (!props.queue.playing.value) return;
  const top = getOverlayStackTop();
  if (stackZ.value < top) {
    stackZ.value = bumpOverlayZ();
  }
});

const activeDef = computed(() => props.queue.active.value);

const iconUrl = computed(() => (activeDef.value ? getAchievementIconUrl(activeDef.value) : ""));

const glowClass = computed(() =>
  shouldSkipDecorativeMotion()
    ? "achievement-toast__icon-glow achievement-toast__icon-glow--static"
    : "achievement-toast__icon-glow",
);

/** @param {boolean} skip */
function setAchievementToastRest(skip) {
  const backdrop = backdropRef.value;
  const content = contentRef.value;
  if (backdrop) {
    gsap.killTweensOf(backdrop);
    gsap.set(backdrop, skip ? { y: 0, opacity: 1 } : { y: "-100%", opacity: 0 });
  }
  if (content) {
    gsap.killTweensOf(content);
    gsap.set(content, skip ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -20, scale: 0.96 });
  }
}

watch(
  () => props.queue.playing.value,
  async (playing) => {
    if (!playing || !activeDef.value) return;
    await animSleep(0);
    const backdrop = backdropRef.value;
    const content = contentRef.value;
    const skip = shouldSkipDecorativeMotion();
    setAchievementToastRest(skip);

    if (!skip) {
      const tl = gsap.timeline();
      if (backdrop) {
        tl.to(
          backdrop,
          { y: 0, opacity: 1, duration: 0.44, ease: "power2.out" },
          0,
        );
      }
      if (content) {
        tl.to(
          content,
          { opacity: 1, y: 0, scale: 1, duration: 0.44, ease: "power2.out" },
          0.08,
        );
      }
      await tl;
    }

    await animSleep(4000);

    if (!skip) {
      const tl = gsap.timeline();
      if (content) {
        tl.to(content, { opacity: 0, y: -16, scale: 0.98, duration: 0.28, ease: "power2.in" }, 0);
      }
      if (backdrop) {
        tl.to(backdrop, { y: "-100%", opacity: 0, duration: 0.36, ease: "power2.in" }, 0.06);
      }
      await tl;
    }

    props.queue.notifyItemDone();
  },
);
</script>

<template>
  <Teleport defer to="#game-view-portal-frame">
    <div
      v-show="queue.playing.value"
      class="achievement-toast portal-overlay-fill"
      :style="stackStyle"
      aria-live="polite"
    >
      <div ref="backdropRef" class="achievement-toast__backdrop" aria-hidden="true">
        <div class="achievement-toast__solid" />
        <div class="achievement-toast__fade" />
      </div>
      <div v-if="activeDef" ref="contentRef" class="achievement-toast__content">
        <p class="achievement-toast__badge">已完成成就</p>
        <div class="achievement-toast__card">
          <div class="achievement-toast__icon-wrap">
            <div :class="glowClass" aria-hidden="true" />
            <img
              class="achievement-toast__icon"
              :src="iconUrl"
              :alt="activeDef.name"
              width="256"
              height="256"
              decoding="sync"
            />
          </div>
          <div class="achievement-toast__text">
            <p class="achievement-toast__name">{{ activeDef.name }}</p>
            <p class="achievement-toast__desc">{{ activeDef.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.achievement-toast {
  --achievement-toast-margin-v: calc(14 * var(--rpx));
  --achievement-toast-content-h: calc(356 * var(--rpx) + var(--achievement-toast-margin-v));
  /* 成就卡下方额外实心留白，再进入渐变消散 */
  --achievement-toast-solid-extra-below: calc(56 * var(--rpx));
  --achievement-toast-solid-h: calc(
    var(--achievement-toast-content-h) + var(--achievement-toast-solid-extra-below)
  );
  --achievement-toast-fade-h: calc(80 * var(--rpx));
  --achievement-toast-bg-opacity: 0.8;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: auto;
  width: 100%;
  height: calc(var(--achievement-toast-solid-h) + var(--achievement-toast-fade-h));
  pointer-events: none;
  overflow: hidden;
}

.achievement-toast__backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  pointer-events: none;
  will-change: transform, opacity;
}

.achievement-toast__solid {
  flex: 0 0 var(--achievement-toast-solid-h);
  background: rgba(0, 0, 0, var(--achievement-toast-bg-opacity));
}

.achievement-toast__fade {
  flex: 0 0 var(--achievement-toast-fade-h);
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, var(--achievement-toast-bg-opacity)) 0%,
    rgba(0, 0, 0, 0) 100%
  );
}

.achievement-toast__content {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: var(--achievement-toast-content-h);
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: calc(var(--achievement-toast-margin-v) + 32 * var(--rpx)) calc(24 * var(--rpx))
    calc(32 * var(--rpx) + var(--achievement-toast-margin-v));
  box-sizing: border-box;
  will-change: transform, opacity;
}

.achievement-toast__badge {
  margin: 0 0 calc(16 * var(--rpx));
  padding: 0;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  line-height: 1.2;
  color: rgba(255, 236, 180, 0.92);
  letter-spacing: 0.12em;
  text-align: center;
}

.achievement-toast__badge::after {
  content: "";
  display: block;
  width: calc(52 * var(--rpx));
  height: calc(2 * var(--rpx));
  margin: calc(10 * var(--rpx)) auto 0;
  background: rgba(237, 194, 46, 0.5);
  border-radius: calc(1 * var(--rpx));
}

.achievement-toast__card {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: calc(18 * var(--rpx));
  width: min(100%, calc(640 * var(--rpx)));
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.06);
  border-radius: calc(12 * var(--rpx));
  border: calc(1 * var(--rpx)) solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 calc(4 * var(--rpx)) calc(16 * var(--rpx)) rgba(0, 0, 0, 0.22);
}

.achievement-toast__icon-wrap {
  position: relative;
  flex-shrink: 0;
  width: calc(192 * var(--rpx));
  height: calc(192 * var(--rpx));
  display: grid;
  place-items: center;
}

.achievement-toast__icon-glow {
  position: absolute;
  inset: calc(-12 * var(--rpx));
  border-radius: calc(32 * var(--rpx));
  background: radial-gradient(circle, rgba(237, 194, 46, 0.42) 0%, rgba(237, 194, 46, 0) 72%);
  opacity: 0.85;
  animation: achievement-toast-icon-pulse 2.4s ease-in-out infinite;
  pointer-events: none;
}

.achievement-toast__icon-glow--static {
  animation: none;
}

@keyframes achievement-toast-icon-pulse {
  0%,
  100% {
    opacity: 0.55;
    transform: scale(0.96);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.04);
  }
}

.achievement-toast__icon {
  position: relative;
  z-index: 1;
  width: calc(176 * var(--rpx));
  height: calc(176 * var(--rpx));
  border-radius: calc(24 * var(--rpx));
  object-fit: cover;
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.16);
  box-shadow:
    0 calc(4 * var(--rpx)) calc(14 * var(--rpx)) rgba(0, 0, 0, 0.35),
    inset 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.12);
}

.achievement-toast__text {
  min-width: 0;
  flex: 1 1 auto;
  text-align: left;
}

.achievement-toast__name {
  margin: 0 0 calc(6 * var(--rpx));
  font-size: calc(32 * var(--rpx));
  font-weight: 800;
  line-height: 1.2;
  color: rgba(252, 248, 242, 0.98);
}

.achievement-toast__desc {
  margin: 0;
  font-size: calc(24 * var(--rpx));
  line-height: 1.45;
  font-weight: 500;
  color: rgba(248, 244, 238, 0.86);
}
</style>
