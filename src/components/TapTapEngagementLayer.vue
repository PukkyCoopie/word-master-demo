<template>
  <Transition name="taptap-engagement-layer">
    <div
      v-if="open"
      class="taptap-engagement-layer-backdrop"
      role="presentation"
      @click="onBackdropClick"
    >
      <div class="taptap-engagement-layer-scrim" aria-hidden="true" />
      <div
        class="taptap-engagement-layer-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <div class="taptap-engagement-layer-header">
          <h2 :id="titleId" class="taptap-engagement-layer-title">评价和反馈</h2>
          <button
            type="button"
            class="taptap-engagement-layer-close"
            aria-label="关闭"
            @click="emit('close')"
          >
            <i class="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        <p v-if="showIntroQuestion" class="taptap-engagement-layer-intro">
          请问目前游戏体验如何？
        </p>

        <div class="taptap-engagement-layer-panels">
          <section class="taptap-engagement-panel">
            <p class="taptap-engagement-panel-text">
              游戏还不错<br />给个好评支持一下
            </p>
            <button
              type="button"
              class="taptap-engagement-panel-btn taptap-engagement-panel-btn--review"
              @click="onReview"
            >
              去 TapTap 评价
            </button>
          </section>

          <div class="taptap-engagement-layer-divider" aria-hidden="true"></div>

          <section class="taptap-engagement-panel">
            <p class="taptap-engagement-panel-text">
              我有问题或建议<br />想要反馈
            </p>
            <button
              type="button"
              class="taptap-engagement-panel-btn taptap-engagement-panel-btn--feedback"
              @click="onFeedback"
            >
              前往论坛反馈
            </button>
          </section>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { openTapTapFeedbackForum, openTapTapReview } from "../taptap/tapTapEngagement.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  showIntroQuestion: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "engaged"]);

const titleId = "taptap-engagement-layer-title";

/** @param {MouseEvent} e */
function onBackdropClick(e) {
  if (e.target === e.currentTarget || /** @type {HTMLElement} */ (e.target).classList.contains("taptap-engagement-layer-scrim")) {
    emit("close");
  }
}

async function onReview() {
  emit("engaged");
  emit("close");
  await openTapTapReview();
}

async function onFeedback() {
  emit("engaged");
  emit("close");
  await openTapTapFeedbackForum();
}
</script>

<style scoped>
.taptap-engagement-layer-backdrop {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  box-sizing: border-box;
}

.taptap-engagement-layer-scrim {
  background: rgba(0, 217, 197, 0.88);
  pointer-events: none;
}

.taptap-engagement-layer-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: min(calc(640 * var(--rpx)), calc(100% - 40 * var(--rpx)));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(28 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.taptap-engagement-layer-header {
  position: relative;
  flex-shrink: 0;
  margin-bottom: calc(16 * var(--rpx));
}

.taptap-engagement-layer-intro {
  margin: 0 0 calc(20 * var(--rpx));
  font-size: calc(32 * var(--rpx));
  line-height: 1.45;
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.taptap-engagement-layer-close {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
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

.taptap-engagement-layer-close:hover {
  filter: brightness(1.04);
}

.taptap-engagement-layer-title {
  margin: 0;
  padding: 0 calc(44 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
  box-sizing: border-box;
}

.taptap-engagement-layer-panels {
  display: flex;
  gap: calc(16 * var(--rpx));
  align-items: stretch;
}

.taptap-engagement-layer-divider {
  flex-shrink: 0;
  width: calc(2 * var(--rpx));
  align-self: stretch;
  background: rgba(0, 0, 0, 0.08);
  border-radius: calc(1 * var(--rpx));
}

.taptap-engagement-panel {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: calc(8 * var(--rpx)) calc(4 * var(--rpx));
}

.taptap-engagement-panel-text {
  flex: 1 1 auto;
  margin: 0 0 calc(20 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  line-height: 1.5;
  font-weight: 600;
  color: var(--text-muted, #776e65);
  text-align: center;
}

.taptap-engagement-panel-btn {
  flex-shrink: 0;
  margin-top: auto;
  width: 100%;
  border: none;
  border-radius: calc(8 * var(--rpx));
  padding: calc(16 * var(--rpx)) calc(12 * var(--rpx));
  font-family: inherit;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  color: #f9f6f2;
  cursor: pointer;
  box-shadow: 0 calc(2 * var(--rpx)) calc(6 * var(--rpx)) rgba(0, 0, 0, 0.12);
  transition: filter 0.12s ease;
}

.taptap-engagement-panel-btn:hover {
  filter: brightness(1.05);
}

.taptap-engagement-panel-btn:active {
  filter: brightness(0.94);
}

.taptap-engagement-panel-btn--review {
  background: #00d9c5;
}

.taptap-engagement-panel-btn--feedback {
  background: #5a8fb8;
}

.taptap-engagement-layer-enter-active,
.taptap-engagement-layer-leave-active {
  transition: opacity calc(0.2s / var(--anim-speed-scale, 1)) ease;
}

.taptap-engagement-layer-enter-active .taptap-engagement-layer-card,
.taptap-engagement-layer-leave-active .taptap-engagement-layer-card {
  transition:
    transform calc(0.2s / var(--anim-speed-scale, 1)) ease,
    opacity calc(0.2s / var(--anim-speed-scale, 1)) ease;
}

.taptap-engagement-layer-enter-from,
.taptap-engagement-layer-leave-to {
  opacity: 0;
}

.taptap-engagement-layer-enter-from .taptap-engagement-layer-card,
.taptap-engagement-layer-leave-to .taptap-engagement-layer-card {
  transform: scale(0.96);
  opacity: 0;
}
</style>
