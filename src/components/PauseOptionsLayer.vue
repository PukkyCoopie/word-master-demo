<template>
  <Transition name="pause-options-layer" :css="true">
    <div
      v-if="open"
      class="pause-options-layer portal-overlay-fill"
      :style="portalStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="onBackdropSelfClick"
    >
      <div class="pause-options-card" @click.stop>
        <h2 :id="titleId" class="pause-options-title">选项</h2>

        <div class="pause-options-actions">
          <button type="button" class="pause-options-btn pause-options-btn--primary" @click="$emit('continue')">
            继续游戏
          </button>
          <button type="button" class="pause-options-btn pause-options-btn--new-run" @click="$emit('new-run')">
            开始新的一局
          </button>
          <button type="button" class="pause-options-btn pause-options-btn--settings" @click="$emit('settings')">
            设置
          </button>
          <button type="button" class="pause-options-btn pause-options-btn--secondary" @click="$emit('main-menu')">
            返回主菜单
          </button>
        </div>
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

const emit = defineEmits(["continue", "new-run", "settings", "main-menu"]);

const titleId = "pause-options-title";
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

function onBackdropSelfClick() {
  backdropSelfCloseGuard.onBackdropSelfClick(() => emit("continue"));
}
</script>

<style scoped>
.pause-options-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  box-sizing: border-box;
  /* 与左下角选项按钮 --btn-yellow 同色，整层约 0.88 透明度（对齐 RunEndLayer） */
  background: rgba(237, 194, 46, 0.88);
}

.pause-options-card {
  width: 100%;
  max-width: calc(680 * var(--rpx));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(28 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.pause-options-title {
  margin: 0 0 calc(22 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.pause-options-actions {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
}

.pause-options-btn {
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  color: #f9f6f2;
  position: relative;
}
.pause-options-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: transparent;
  transition: background 0.12s ease;
}

.pause-options-btn--primary {
  background: #5a8fb8;
}

.pause-options-btn--new-run {
  background: #6a9e5c;
}

.pause-options-btn--settings {
  background: #d4954a;
}

.pause-options-btn--settings:disabled {
  opacity: 0.52;
  cursor: default;
}

.pause-options-btn--secondary {
  background: var(--card, #eee4da);
  color: var(--text-dark, #3c3a32);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
  box-shadow: none;
}

.pause-options-btn:not(:disabled):hover::after {
  background: rgba(255, 255, 255, 0.08);
}

.pause-options-btn:not(:disabled):active::after {
  background: rgba(0, 0, 0, 0.07);
}

.pause-options-layer-enter-active,
.pause-options-layer-leave-active {
  transition: opacity 0.28s var(--ease-expo-out, ease-out);
}

.pause-options-layer-enter-active .pause-options-card,
.pause-options-layer-leave-active .pause-options-card {
  transition:
    opacity 0.32s var(--ease-expo-out, ease-out),
    transform 0.32s var(--ease-expo-out, ease-out);
}

.pause-options-layer-enter-from,
.pause-options-layer-leave-to {
  opacity: 0;
}

.pause-options-layer-enter-from .pause-options-card,
.pause-options-layer-leave-to .pause-options-card {
  opacity: 0;
  transform: scale(0.94) translateY(calc(12 * var(--rpx)));
}
</style>
