<script setup>
import { computed, ref, watch } from "vue";
import gsap from "gsap";
import { getOverlayStackTop } from "../game/overlayStack.js";
import { getAchievementIconUrl } from "../achievements/achievementDefinitions.js";
import { animSleep, shouldSkipDecorativeMotion } from "../settings/animationSpeed.js";

const props = defineProps({
  queue: { type: Object, required: true },
});

const rootRef = ref(null);

const stackStyle = computed(() => ({
  zIndex: getOverlayStackTop() + 20,
}));

const activeDef = computed(() => props.queue.active.value);

const iconUrl = computed(() => (activeDef.value ? getAchievementIconUrl(activeDef.value) : ""));

const glowClass = computed(() =>
  shouldSkipDecorativeMotion() ? "achievement-toast__glow achievement-toast__glow--static" : "achievement-toast__glow",
);

watch(
  () => props.queue.playing.value,
  async (playing) => {
    if (!playing || !activeDef.value) return;
    await animSleep(0);
    const el = rootRef.value;
    const skip = shouldSkipDecorativeMotion();
    if (el && !skip) {
      gsap.killTweensOf(el);
      await gsap.fromTo(
        el,
        { opacity: 0, y: -24 },
        { opacity: 1, y: 0, duration: 0.42, ease: "power2.out" },
      );
    } else if (el) {
      gsap.set(el, { opacity: 1, y: 0 });
    }
    await animSleep(4000);
    if (el && !skip) {
      gsap.killTweensOf(el);
      await gsap.to(el, { opacity: 0, y: -20, duration: 0.32, ease: "power2.in" });
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
      <div class="achievement-toast__shade" aria-hidden="true" />
      <div v-if="activeDef" ref="rootRef" class="achievement-toast__panel">
        <div :class="glowClass" aria-hidden="true" />
        <p class="achievement-toast__heading">已完成成就</p>
        <div class="achievement-toast__body">
          <img
            class="achievement-toast__icon"
            :src="iconUrl"
            :alt="activeDef.name"
            width="256"
            height="256"
            decoding="async"
          />
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
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: calc(250 * var(--rpx));
  pointer-events: none;
  overflow: hidden;
}

.achievement-toast__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.58) 0%, rgba(0, 0, 0, 0.08) 72%, rgba(0, 0, 0, 0) 100%);
}

.achievement-toast__panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: calc(12 * var(--rpx)) calc(20 * var(--rpx)) calc(16 * var(--rpx));
  box-sizing: border-box;
}

.achievement-toast__glow {
  position: absolute;
  left: 50%;
  top: 42%;
  width: calc(320 * var(--rpx));
  height: calc(320 * var(--rpx));
  margin-left: calc(-160 * var(--rpx));
  margin-top: calc(-160 * var(--rpx));
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    rgba(255, 220, 140, 0.45),
    rgba(255, 255, 255, 0.08),
    rgba(200, 170, 255, 0.35),
    rgba(255, 255, 255, 0.06),
    rgba(255, 220, 140, 0.45)
  );
  filter: blur(calc(18 * var(--rpx)));
  opacity: 0.55;
  animation: achievement-toast-glow-spin 6s linear infinite;
  pointer-events: none;
}

.achievement-toast__glow--static {
  animation: none;
}

@keyframes achievement-toast-glow-spin {
  to {
    transform: rotate(360deg);
  }
}

.achievement-toast__heading {
  margin: 0 0 calc(10 * var(--rpx));
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  letter-spacing: calc(1 * var(--rpx));
}

.achievement-toast__body {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: calc(14 * var(--rpx));
  max-width: 100%;
}

.achievement-toast__icon {
  width: calc(72 * var(--rpx));
  height: calc(72 * var(--rpx));
  flex-shrink: 0;
  border-radius: calc(10 * var(--rpx));
  object-fit: cover;
  box-shadow: 0 calc(4 * var(--rpx)) calc(12 * var(--rpx)) rgba(0, 0, 0, 0.28);
}

.achievement-toast__text {
  min-width: 0;
  max-width: calc(520 * var(--rpx));
  text-align: left;
}

.achievement-toast__name {
  margin: 0 0 calc(4 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: #fff;
}

.achievement-toast__desc {
  margin: 0;
  font-size: calc(18 * var(--rpx));
  line-height: 1.35;
  color: rgba(255, 255, 255, 0.82);
}
</style>
