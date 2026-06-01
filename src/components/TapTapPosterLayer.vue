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
        :aria-busy="!posterLoaded"
        @click.stop="onPosterClick"
      >
        <div class="taptap-poster-layer-poster-frame">
          <div
            v-if="!posterLoaded"
            class="taptap-poster-layer-poster-loading"
            aria-hidden="true"
          >
            <span class="taptap-poster-layer-poster-spinner"></span>
          </div>
          <img
            ref="posterImgRef"
            class="taptap-poster-layer-poster"
            :class="{ 'taptap-poster-layer-poster--loaded': posterLoaded }"
            :src="TAP_TAP_POSTER_SRC"
            alt="Word Master TapTap 海报"
            draggable="false"
            @load="onPosterLoad"
            @error="onPosterLoad"
          />
        </div>
      </button>
    </div>
  </Transition>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import {
  getTapTapPromoLabel,
  openTapTapAppPage,
  TAP_TAP_POSTER_LAYER_Z,
  TAP_TAP_POSTER_SRC,
} from "../taptap/tapTapWebPromo.js";

const promoLabel = computed(() => getTapTapPromoLabel());

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);

const posterLoaded = ref(false);
/** @type {import('vue').Ref<HTMLImageElement | null>} */
const posterImgRef = ref(null);

watch(
  () => props.open,
  async (isOpen) => {
    posterLoaded.value = false;
    if (!isOpen) return;
    await nextTick();
    const img = posterImgRef.value;
    if (img?.complete && img.naturalWidth > 0) {
      posterLoaded.value = true;
    }
  },
);

function onPosterLoad() {
  posterLoaded.value = true;
}

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

.taptap-poster-layer-poster-frame {
  position: relative;
  display: block;
}

.taptap-poster-layer-poster-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: min(92vw, calc(640 * var(--rpx)));
  aspect-ratio: 640 / 1100;
  max-height: min(86vh, calc(1100 * var(--rpx)));
  background: #f5f0e8;
}

.taptap-poster-layer-poster-spinner {
  width: calc(40 * var(--rpx));
  height: calc(40 * var(--rpx));
  border-radius: 50%;
  border: calc(4 * var(--rpx)) solid rgba(90, 143, 184, 0.22);
  border-top-color: #5a8fb8;
  animation: taptap-poster-layer-spin calc(0.8s / var(--anim-speed-scale, 1)) linear infinite;
}

@keyframes taptap-poster-layer-spin {
  to {
    transform: rotate(360deg);
  }
}

.taptap-poster-layer-poster {
  display: block;
  width: auto;
  height: auto;
  max-width: min(92vw, calc(640 * var(--rpx)));
  max-height: min(86vh, calc(1100 * var(--rpx)));
  object-fit: contain;
  opacity: 0;
  transition: opacity calc(0.2s / var(--anim-speed-scale, 1)) ease;
}

.taptap-poster-layer-poster--loaded {
  opacity: 1;
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
