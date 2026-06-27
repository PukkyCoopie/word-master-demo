<template>
  <Transition name="taptap-lb-web-hint-layer">
    <div
      v-if="open"
      class="taptap-lb-web-hint-layer-backdrop"
      role="presentation"
      @click="onBackdropClick"
    >
      <div class="taptap-lb-web-hint-layer-scrim" aria-hidden="true" />
      <div
        class="taptap-lb-web-hint-layer-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="taptap-lb-web-hint-title"
        @click.stop
      >
        <button
          type="button"
          class="taptap-lb-web-hint-layer-close"
          aria-label="关闭"
          @click="emit('close')"
        >
          <i class="ri-close-line" aria-hidden="true"></i>
        </button>
        <h2 id="taptap-lb-web-hint-title" class="taptap-lb-web-hint-layer-title">排行榜</h2>
        <p class="taptap-lb-web-hint-layer-message">
          <span>Web 端暂时无法接入排行榜，您可以前往</span>
          <button
            type="button"
            class="taptap-lb-web-hint-inline-icon"
            aria-label="打开 TapTap 游戏海报"
            @click="emit('open-poster')"
          >
            <img
              class="taptap-lb-web-hint-inline-icon-img"
              :src="TAP_TAP_ICON_SRC"
              alt=""
              width="22"
              height="22"
              decoding="sync"
            />
          </button>
          <span>体验完整游戏</span>
        </p>
        <button type="button" class="taptap-lb-web-hint-layer-ok" @click="emit('close')">
          知道了
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { watch } from "vue";
import { createBackdropSelfCloseGuard } from "../game/backdropSelfCloseGuard.js";
import { TAP_TAP_ICON_SRC } from "../taptap/tapTapWebPromo.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent } from "../platform/haptics.js";

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "open-poster"]);

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
  backdropSelfCloseGuard.onBackdropSelfClick(() => emit("close"));
}
</script>

<style scoped>
.taptap-lb-web-hint-layer-backdrop {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  box-sizing: border-box;
}

.taptap-lb-web-hint-layer-scrim {
  background: rgba(201, 162, 39, 0.88);
  pointer-events: none;
}

.taptap-lb-web-hint-layer-card {
  position: relative;
  z-index: 1;
  width: min(calc(640 * var(--rpx)), calc(100% - 40 * var(--rpx)));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(28 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.taptap-lb-web-hint-layer-close {
  position: absolute;
  top: calc(24 * var(--rpx));
  right: calc(20 * var(--rpx));
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(44 * var(--rpx));
  height: calc(44 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: calc(8 * var(--rpx));
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-dark, #3c3a32);
  font-size: calc(28 * var(--rpx));
  cursor: pointer;
}

.taptap-lb-web-hint-layer-close:hover {
  filter: brightness(1.04);
}

.taptap-lb-web-hint-layer-title {
  margin: 0 0 calc(18 * var(--rpx));
  padding-right: calc(44 * var(--rpx));
  font-size: calc(36 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.taptap-lb-web-hint-layer-message {
  margin: 0 0 calc(24 * var(--rpx));
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: calc(6 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  font-weight: 600;
  line-height: 1.5;
  color: rgba(60, 58, 50, 0.88);
  text-align: center;
}

.taptap-lb-web-hint-inline-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0 calc(2 * var(--rpx));
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 0;
  border-radius: calc(12 * var(--rpx));
  vertical-align: middle;
  transition: filter 0.12s ease, transform 0.12s ease;
}

.taptap-lb-web-hint-inline-icon:hover {
  filter: brightness(1.06);
}

.taptap-lb-web-hint-inline-icon:active {
  filter: brightness(0.94);
  transform: scale(0.96);
}

.taptap-lb-web-hint-inline-icon-img {
  display: block;
  width: calc(48 * var(--rpx));
  height: calc(48 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  box-shadow: 0 calc(1 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.1);
}

@media (max-aspect-ratio: 1/1) {
  .taptap-lb-web-hint-inline-icon-img {
    width: calc(64 * var(--rpx));
    height: calc(64 * var(--rpx));
  }
}

.taptap-lb-web-hint-layer-ok {
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

.taptap-lb-web-hint-layer-ok:hover {
  filter: brightness(1.05);
}

.taptap-lb-web-hint-layer-ok:active {
  filter: brightness(0.92);
}

.taptap-lb-web-hint-layer-enter-active,
.taptap-lb-web-hint-layer-leave-active {
  transition: opacity calc(0.2s / var(--anim-speed-scale, 1)) ease;
}

.taptap-lb-web-hint-layer-enter-active .taptap-lb-web-hint-layer-card,
.taptap-lb-web-hint-layer-leave-active .taptap-lb-web-hint-layer-card {
  transition:
    transform calc(0.2s / var(--anim-speed-scale, 1)) ease,
    opacity calc(0.2s / var(--anim-speed-scale, 1)) ease;
}

.taptap-lb-web-hint-layer-enter-from,
.taptap-lb-web-hint-layer-leave-to {
  opacity: 0;
}

.taptap-lb-web-hint-layer-enter-from .taptap-lb-web-hint-layer-card,
.taptap-lb-web-hint-layer-leave-to .taptap-lb-web-hint-layer-card {
  transform: scale(0.96);
  opacity: 0;
}
</style>
