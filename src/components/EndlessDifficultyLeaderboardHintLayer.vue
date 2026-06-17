<template>
  <Transition name="endless-diff0-hint-layer">
    <div
      v-if="open"
      class="endless-diff0-hint-layer-backdrop"
      :style="portalStackStyle"
      role="presentation"
      @click="onBackdropClick"
    >
      <div class="endless-diff0-hint-layer-scrim" aria-hidden="true" />
      <div
        class="endless-diff0-hint-layer-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="endless-diff0-hint-title"
        @click.stop
      >
        <h2 id="endless-diff0-hint-title" class="endless-diff0-hint-layer-title">提示</h2>
        <p class="endless-diff0-hint-layer-message">
          您目前正在游玩难度0，无尽模式的关卡数将不会计入排行榜。
        </p>
        <button type="button" class="endless-diff0-hint-layer-confirm" @click="emit('confirm')">
          确认
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { watch } from "vue";
import { createBackdropSelfCloseGuard } from "../game/backdropSelfCloseGuard.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent } from "../platform/haptics.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  portalStackStyle: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["confirm"]);

const backdropSelfCloseGuard = createBackdropSelfCloseGuard();

watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen) {
      backdropSelfCloseGuard.arm();
      scheduleOverlayPresent(280);
    } else if (wasOpen) {
      scheduleOverlayDismiss(240);
    }
  },
);

function onBackdropClick() {
  backdropSelfCloseGuard.onBackdropSelfClick(() => emit("confirm"));
}
</script>

<style scoped>
.endless-diff0-hint-layer-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  box-sizing: border-box;
}

.endless-diff0-hint-layer-scrim {
  position: absolute;
  inset: 0;
  background: rgba(90, 143, 184, 0.88);
  pointer-events: none;
}

.endless-diff0-hint-layer-card {
  position: relative;
  z-index: 1;
  width: min(calc(640 * var(--rpx)), calc(100% - 40 * var(--rpx)));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(28 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.endless-diff0-hint-layer-title {
  margin: 0 0 calc(18 * var(--rpx));
  font-size: calc(36 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.endless-diff0-hint-layer-message {
  margin: 0 0 calc(24 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  font-weight: 600;
  line-height: 1.5;
  color: rgba(60, 58, 50, 0.88);
  text-align: center;
}

.endless-diff0-hint-layer-confirm {
  display: block;
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  color: #f9f6f2;
  background: #5a8fb8;
  box-shadow: var(--shadow);
  cursor: pointer;
  transition: filter 0.12s ease;
}

.endless-diff0-hint-layer-confirm:hover {
  filter: brightness(1.05);
}

.endless-diff0-hint-layer-confirm:active {
  filter: brightness(0.92);
}

.endless-diff0-hint-layer-enter-active,
.endless-diff0-hint-layer-leave-active {
  transition: opacity calc(0.2s / var(--anim-speed-scale, 1)) ease;
}

.endless-diff0-hint-layer-enter-active .endless-diff0-hint-layer-card,
.endless-diff0-hint-layer-leave-active .endless-diff0-hint-layer-card {
  transition:
    transform calc(0.2s / var(--anim-speed-scale, 1)) ease,
    opacity calc(0.2s / var(--anim-speed-scale, 1)) ease;
}

.endless-diff0-hint-layer-enter-from,
.endless-diff0-hint-layer-leave-to {
  opacity: 0;
}

.endless-diff0-hint-layer-enter-from .endless-diff0-hint-layer-card,
.endless-diff0-hint-layer-leave-to .endless-diff0-hint-layer-card {
  transform: scale(0.96);
  opacity: 0;
}
</style>
