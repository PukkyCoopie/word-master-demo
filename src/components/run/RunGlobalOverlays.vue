<script setup>
import { computed, inject } from "vue";
import { RUN_SESSION_KEY } from "../../runSession/useRunSession.js";
import { sessionUnref as sv } from "../../runSession/sessionUnref.js";

/** @type {import('../../runSession/runSessionTypes.js').RunSession} */
const session = inject(RUN_SESSION_KEY);
const overlayStack = session?.overlayStack;
if (!overlayStack?.initGlobalOverlays) {
  throw new Error("RunGlobalOverlays: overlayStack missing");
}

const dictFatalOpen = computed(() => !!sv(overlayStack.dictFatalOpen));
const dictFatalMessage = computed(() => sv(overlayStack.dictFatalMessage) ?? "");
const toastMessage = computed(() => sv(overlayStack.toast) ?? "");
</script>

<template>
  <Teleport defer to="#game-view-portal-frame">
    <div
      v-if="dictFatalOpen"
      class="dict-fatal-layer portal-overlay-fill"
      :style="overlayStack.dictFatalPortalStackStyle"
    >
      <div class="dict-fatal-card">
        <div class="dict-fatal-title">词典加载失败</div>
        <div class="dict-fatal-message">{{ dictFatalMessage }}</div>
        <button type="button" class="dict-fatal-btn" @click="overlayStack.onDictFatalReload()">
          刷新重试
        </button>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="toastMessage" class="toast" :style="overlayStack.toastPortalStackStyle">
      {{ toastMessage }}
    </div>
  </Teleport>
</template>

<style scoped>
.dict-fatal-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
  background: rgba(0, 0, 0, 0.5);
  border-radius: calc(12 * var(--rpx));
}
.dict-fatal-card {
  width: min(calc(560 * var(--rpx)), 100%);
  background: #7a6f65;
  border-radius: calc(14 * var(--rpx));
  padding: calc(28 * var(--rpx));
  box-shadow: 0 calc(12 * var(--rpx)) calc(40 * var(--rpx)) rgba(0, 0, 0, 0.35);
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.12);
  display: flex;
  flex-direction: column;
  gap: calc(16 * var(--rpx));
  align-items: center;
  text-align: center;
  color: #fff;
}
.dict-fatal-title {
  font-size: calc(34 * var(--rpx));
  font-weight: 800;
  letter-spacing: 0.02em;
}
.dict-fatal-message {
  font-size: calc(24 * var(--rpx));
  line-height: 1.55;
  opacity: 0.95;
}
.dict-fatal-btn {
  border: none;
  border-radius: var(--radius);
  padding: calc(14 * var(--rpx)) calc(22 * var(--rpx));
  background: var(--btn-yellow);
  color: #776e65;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  position: relative;
}
.dict-fatal-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0);
  transition: background 0.12s ease;
}
.dict-fatal-btn:hover::after {
  background: rgba(255, 255, 255, 0.12);
}
.dict-fatal-btn:active::after {
  background: rgba(0, 0, 0, 0.08);
}
.toast {
  position: fixed;
  left: 50%;
  bottom: calc(120 * var(--rpx));
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: calc(12 * var(--rpx)) calc(24 * var(--rpx));
  border-radius: var(--radius);
  font-size: calc(22 * var(--rpx));
  opacity: 1;
  animation: toastIn 0.32s var(--ease-expo-out) both;
}
@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(calc(8 * var(--rpx)));
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
