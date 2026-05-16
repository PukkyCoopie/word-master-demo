<template>
  <Transition name="run-end-layer" :css="true">
    <div
      v-if="open"
      class="run-end-layer portal-overlay-fill"
      :class="outcome === 'win' ? 'run-end-layer--win' : 'run-end-layer--fail'"
      :style="portalStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
    >
      <div class="run-end-card">
        <h2 :id="titleId" class="run-end-title">{{ titleText }}</h2>
        <p v-if="subtitleText" class="run-end-sub">{{ subtitleText }}</p>

        <div class="run-end-actions">
          <button
            v-if="outcome === 'win' && showEndless"
            type="button"
            class="run-end-btn run-end-btn--endless"
            @click="$emit('endless')"
          >
            无尽模式
          </button>
          <button type="button" class="run-end-btn run-end-btn--primary" @click="$emit('retry')">
            再来一局
          </button>
          <button type="button" class="run-end-btn run-end-btn--secondary" @click="$emit('main-menu')">
            回到主菜单
          </button>
        </div>
        </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {'fail' | 'win'} */
  outcome: { type: String, default: "fail" },
  /** 胜利时是否展示无尽模式入口 */
  showEndless: { type: Boolean, default: true },
  portalStackStyle: { type: Object, default: () => ({}) },
});

defineEmits(["retry", "main-menu", "endless"]);

const titleId = "run-end-title";

const titleText = computed(() => (props.outcome === "win" ? "通关！" : "游戏结束"));
const subtitleText = computed(() => {
  if (props.outcome === "win") {
    return "你已完成 8-3，可进入无尽模式继续挑战更高目标分。";
  }
  return "出牌次数已用尽，未能达到本关目标分。";
});
</script>

<style scoped>
.run-end-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  box-sizing: border-box;
}

.run-end-layer--fail {
  background: rgba(196, 74, 74, 0.88);
}

.run-end-layer--win {
  background: rgba(142, 204, 142, 0.88);
}

.run-end-card {
  width: 100%;
  max-width: calc(680 * var(--rpx));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(28 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.run-end-title {
  margin: 0 0 calc(10 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.run-end-sub {
  margin: 0 0 calc(26 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 600;
  color: var(--text-soft);
  text-align: center;
  line-height: 1.45;
}

.run-end-actions {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
}

.run-end-btn {
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
}

.run-end-btn--primary {
  background: #5a8fb8;
}

.run-end-btn--endless {
  background: #6a9e5c;
}

.run-end-btn--secondary {
  background: var(--card, #eee4da);
  color: var(--text-dark, #3c3a32);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
  box-shadow: none;
}

.run-end-btn:hover {
  filter: brightness(1.05);
}

.run-end-btn:active {
  filter: brightness(0.92);
}

.run-end-layer-enter-active,
.run-end-layer-leave-active {
  transition: opacity 0.28s var(--ease-expo-out, ease-out);
}

.run-end-layer-enter-active .run-end-card,
.run-end-layer-leave-active .run-end-card {
  transition:
    opacity 0.32s var(--ease-expo-out, ease-out),
    transform 0.32s var(--ease-expo-out, ease-out);
}

.run-end-layer-enter-from,
.run-end-layer-leave-to {
  opacity: 0;
}

.run-end-layer-enter-from .run-end-card,
.run-end-layer-leave-to .run-end-card {
  opacity: 0;
  transform: scale(0.94) translateY(calc(12 * var(--rpx)));
}
</style>
