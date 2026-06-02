<template>
  <button
    v-if="inAbout"
    type="button"
    class="taptap-promo-icon-wrap taptap-promo-icon-wrap--in-about"
    :aria-label="promoLabel"
    @click="$emit('open-poster')"
  >
    <span class="taptap-promo-about-text">{{ promoAboutLead }}</span>
    <img
      class="taptap-promo-icon-img taptap-promo-icon-img--in-about"
      :src="TAP_TAP_ICON_SRC"
      alt=""
      width="22"
      height="22"
    />
    <span class="taptap-promo-about-text">{{ promoAboutTail }}</span>
  </button>
  <div
    v-else
    class="taptap-promo-icon-wrap"
    :class="{
      'taptap-promo-icon-wrap--desktop': desktop,
      'taptap-promo-icon-wrap--in-menu': inMenu,
      'taptap-promo-icon-wrap--viewport-fixed': viewportFixed,
    }"
    :style="viewportFixed ? { zIndex: TAP_TAP_VIEWPORT_PROMO_Z } : undefined"
  >
    <span
      v-if="desktop"
      class="taptap-promo-icon-label"
      aria-hidden="true"
    >
      {{ promoLabel }}
    </span>
    <button
      type="button"
      class="taptap-promo-icon-btn"
      :aria-label="promoLabel"
      @click="$emit('open-poster')"
    >
      <img class="taptap-promo-icon-img" :src="TAP_TAP_ICON_SRC" alt="" width="80" height="80" />
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  TAP_TAP_ICON_SRC,
  TAP_TAP_VIEWPORT_PROMO_Z,
  getTapTapPromoAboutLead,
  getTapTapPromoAboutTail,
  getTapTapPromoLabel,
} from "../taptap/tapTapWebPromo.js";

const promoLabel = computed(() => getTapTapPromoLabel());
const promoAboutLead = computed(() => getTapTapPromoAboutLead());
const promoAboutTail = computed(() => getTapTapPromoAboutTail());

defineProps({
  /** 电脑端：悬停显示 label */
  desktop: { type: Boolean, default: false },
  /** 主菜单内定位（手机端右下角） */
  inMenu: { type: Boolean, default: false },
  /** 固定于浏览器视口右下角（须 Teleport 到 body） */
  viewportFixed: { type: Boolean, default: false },
  /** 关于页「关于本游戏」：左对齐、整行可点 */
  inAbout: { type: Boolean, default: false },
});

defineEmits(["open-poster"]);
</script>

<style scoped>
.taptap-promo-icon-wrap {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
  gap: calc(10 * var(--rpx));
  pointer-events: auto;
}

.taptap-promo-icon-wrap--in-menu {
  position: absolute;
  right: calc(18 * var(--rpx));
  bottom: calc(18 * var(--rpx));
  z-index: 2;
}

.taptap-promo-icon-wrap--viewport-fixed {
  position: fixed;
  right: max(24px, env(safe-area-inset-right, 0px));
  bottom: max(24px, env(safe-area-inset-bottom, 0px));
  gap: 12px;
  isolation: isolate;
}

.taptap-promo-icon-wrap--viewport-fixed .taptap-promo-icon-btn {
  position: relative;
  z-index: 1;
  border-radius: calc(18 * var(--rpx));
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.14);
}

.taptap-promo-icon-wrap--viewport-fixed .taptap-promo-icon-img {
  width: 64px;
  height: 64px;
}

.taptap-promo-icon-wrap--viewport-fixed .taptap-promo-icon-label {
  z-index: 1;
  right: 76px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 15px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

.taptap-promo-icon-wrap--in-about {
  position: static;
  flex-direction: row;
  align-self: flex-start;
  justify-content: flex-start;
  gap: calc(8 * var(--rpx));
  margin-top: calc(14 * var(--rpx));
  padding: calc(10 * var(--rpx)) 0 0;
  border: none;
  border-top: calc(2 * var(--rpx)) solid rgba(60, 58, 50, 0.1);
  background: transparent;
  cursor: pointer;
  width: 100%;
  box-sizing: border-box;
  text-align: left;
  font: inherit;
  transition: filter 0.12s ease;
}

.taptap-promo-icon-wrap--in-about:hover {
  filter: brightness(1.04);
}

.taptap-promo-icon-wrap--in-about:active {
  filter: brightness(0.96);
}

.taptap-promo-about-text {
  font-size: calc(24 * var(--rpx));
  font-weight: 600;
  line-height: 1.35;
  color: rgba(60, 58, 50, 0.78);
}

.taptap-promo-icon-btn {
  display: block;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: calc(18 * var(--rpx));
  line-height: 0;
  box-shadow: 0 calc(2 * var(--rpx)) calc(8 * var(--rpx)) rgba(0, 0, 0, 0.12);
  transition: filter 0.12s ease, transform 0.12s ease;
}

.taptap-promo-icon-btn:hover {
  filter: brightness(1.06);
}

.taptap-promo-icon-btn:active {
  filter: brightness(0.94);
  transform: scale(0.96);
}

.taptap-promo-icon-img {
  display: block;
  width: calc(80 * var(--rpx));
  height: calc(80 * var(--rpx));
}

.taptap-promo-icon-img--in-about {
  width: calc(48 * var(--rpx));
  height: calc(48 * var(--rpx));
  flex-shrink: 0;
  border-radius: calc(12 * var(--rpx));
  box-shadow: 0 calc(1 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.1);
}

/* 与 useWebLayoutMode 手机端判定一致（视口宽高比 ≤ 1:1） */
@media (max-aspect-ratio: 1/1) {
  .taptap-promo-icon-img--in-about {
    width: calc(64 * var(--rpx));
    height: calc(64 * var(--rpx));
  }
}

.taptap-promo-icon-label {
  position: absolute;
  right: calc(48 * var(--rpx));
  bottom: 50%;
  transform: translateY(50%) translateX(calc(6 * var(--rpx)));
  padding: calc(8 * var(--rpx)) calc(14 * var(--rpx));
  border-radius: calc(6 * var(--rpx));
  background: #fff;
  color: #3c3a32;
  font-size: calc(22 * var(--rpx));
  font-weight: 600;
  line-height: 1.35;
  white-space: nowrap;
  box-shadow: 0 calc(2 * var(--rpx)) calc(10 * var(--rpx)) rgba(0, 0, 0, 0.1);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.15s ease, visibility 0.15s ease, transform 0.15s ease;
}

.taptap-promo-icon-wrap--desktop:hover .taptap-promo-icon-label,
.taptap-promo-icon-wrap--desktop:focus-within .taptap-promo-icon-label {
  opacity: 1;
  visibility: visible;
  transform: translateY(50%) translateX(0);
}
</style>
