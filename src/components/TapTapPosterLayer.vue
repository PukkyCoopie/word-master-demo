<template>
  <Transition name="taptap-poster-layer">
    <div
      v-if="open"
      class="taptap-poster-layer"
      :style="{ zIndex: TAP_TAP_POSTER_LAYER_Z }"
      role="dialog"
      aria-modal="true"
      aria-label="TapTap 游戏海报"
      @click="onBackdropClick"
    >
      <div class="taptap-poster-layer-scrim" aria-hidden="true" />
      <button
        type="button"
        class="taptap-poster-layer-close"
        aria-label="关闭"
        @click.stop="$emit('close')"
      >
        <i class="ri-close-line" aria-hidden="true"></i>
      </button>
      <button
        type="button"
        class="taptap-poster-layer-poster-btn"
        :aria-label="promoLabel"
        @click.stop="onPosterClick"
      >
        <img
          class="taptap-poster-layer-poster"
          :src="TAP_TAP_POSTER_SRC"
          alt="Word Master TapTap 海报"
          draggable="false"
        />
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from "vue";
import {
  getTapTapPromoLabel,
  openTapTapAppPage,
  TAP_TAP_POSTER_LAYER_Z,
  TAP_TAP_POSTER_SRC,
} from "../taptap/tapTapWebPromo.js";

const promoLabel = computed(() => getTapTapPromoLabel());

defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);

function onPosterClick() {
  openTapTapAppPage();
  emit("close");
}

/** @param {MouseEvent} e */
function onBackdropClick(e) {
  if (e.target === e.currentTarget || /** @type {HTMLElement} */ (e.target).classList.contains("taptap-poster-layer-scrim")) {
    emit("close");
  }
}
</script>

<style scoped>
.taptap-poster-layer {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
  box-sizing: border-box;
  pointer-events: auto;
}

.taptap-poster-layer-scrim {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
}

.taptap-poster-layer-close {
  position: absolute;
  top: max(calc(16 * var(--rpx)), env(safe-area-inset-top, 0px));
  right: max(calc(16 * var(--rpx)), env(safe-area-inset-right, 0px));
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(44 * var(--rpx));
  height: calc(44 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #3c3a32;
  font-size: calc(28 * var(--rpx));
  cursor: pointer;
  box-shadow: 0 calc(2 * var(--rpx)) calc(10 * var(--rpx)) rgba(0, 0, 0, 0.15);
}

.taptap-poster-layer-close:hover {
  filter: brightness(1.04);
}

.taptap-poster-layer-poster-btn {
  position: relative;
  z-index: 1;
  display: block;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: calc(10 * var(--rpx));
  overflow: hidden;
  box-shadow: 0 calc(6 * var(--rpx)) calc(24 * var(--rpx)) rgba(0, 0, 0, 0.22);
  max-width: min(92vw, calc(640 * var(--rpx)));
  max-height: min(86vh, calc(1100 * var(--rpx)));
}

.taptap-poster-layer-poster {
  display: block;
  width: auto;
  height: auto;
  max-width: min(92vw, calc(640 * var(--rpx)));
  max-height: min(86vh, calc(1100 * var(--rpx)));
  object-fit: contain;
}

.taptap-poster-layer-enter-active,
.taptap-poster-layer-leave-active {
  transition: opacity 0.2s ease;
}

.taptap-poster-layer-enter-active .taptap-poster-layer-poster-btn,
.taptap-poster-layer-leave-active .taptap-poster-layer-poster-btn {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.taptap-poster-layer-enter-from,
.taptap-poster-layer-leave-to {
  opacity: 0;
}

.taptap-poster-layer-enter-from .taptap-poster-layer-poster-btn,
.taptap-poster-layer-leave-to .taptap-poster-layer-poster-btn {
  transform: scale(0.94);
  opacity: 0;
}
</style>
