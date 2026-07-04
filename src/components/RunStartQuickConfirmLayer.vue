<template>
  <Transition name="run-start-quick-confirm" :css="true">
    <div
      v-if="open"
      class="run-start-quick-confirm-backdrop portal-overlay-fill"
      :style="backdropStackStyle"
      role="presentation"
      @click="onBackdropClick"
    >
      <div class="run-start-quick-confirm-scrim" aria-hidden="true" />
      <div
        class="run-start-quick-confirm-card"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <h2 :id="titleId" class="run-start-quick-confirm-title">{{ title }}</h2>
        <p class="run-start-quick-confirm-message">{{ message }}</p>
        <div class="run-start-quick-confirm-actions">
          <template v-if="kind === 'continue'">
            <button
              type="button"
              class="run-start-quick-confirm-btn run-start-quick-confirm-btn--primary"
              @click="emit('confirm')"
            >
              继续
            </button>
            <button
              type="button"
              class="run-start-quick-confirm-btn run-start-quick-confirm-btn--new-run"
              @click="emit('cancel')"
            >
              新游戏
            </button>
            <button
              type="button"
              class="run-start-quick-confirm-btn run-start-quick-confirm-btn--secondary"
              @click="emit('dismiss')"
            >
              取消
            </button>
          </template>
          <template v-else>
            <button
              type="button"
              class="run-start-quick-confirm-btn run-start-quick-confirm-btn--primary"
              @click="emit('confirm')"
            >
              {{ confirmLabel }}
            </button>
            <button
              type="button"
              class="run-start-quick-confirm-btn run-start-quick-confirm-btn--secondary"
              @click="emit('cancel')"
            >
              {{ cancelLabel }}
            </button>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { createBackdropSelfCloseGuard } from "../game/backdropSelfCloseGuard.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  kind: { type: String, default: "new-run" },
  title: { type: String, default: "提示" },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: "确定" },
  cancelLabel: { type: String, default: "取消" },
  /** 嵌在更高 z 浮层（如设置）之上时传入下限 */
  minZIndex: { type: Number, default: 0 },
});

const emit = defineEmits(["confirm", "cancel", "dismiss"]);

const titleId = "run-start-quick-confirm-title";
const stackZ = ref(0);
const backdropSelfCloseGuard = createBackdropSelfCloseGuard();

const backdropStackStyle = computed(() =>
  stackZ.value > 0 ? { zIndex: stackZ.value } : {},
);

watch(
  () => [props.open, props.minZIndex],
  ([isOpen, minZ]) => {
    if (isOpen) {
      const floor = Math.max(0, Math.floor(Number(minZ) || 0));
      stackZ.value = Math.max(bumpOverlayZ(), floor);
      backdropSelfCloseGuard.arm();
    }
  },
  { immediate: true },
);

function onDismiss() {
  emit("dismiss");
}

/** @param {MouseEvent} e */
function onBackdropClick(e) {
  const target = /** @type {HTMLElement} */ (e.target);
  if (
    target !== e.currentTarget
    && !target.classList.contains("run-start-quick-confirm-scrim")
  ) {
    return;
  }
  backdropSelfCloseGuard.onBackdropSelfClick(onDismiss);
}
</script>

<style scoped>
.run-start-quick-confirm-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  box-sizing: border-box;
}

.run-start-quick-confirm-scrim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgba(0, 0, 0, 0.42);
}

.run-start-quick-confirm-card {
  position: relative;
  width: 100%;
  max-width: calc(680 * var(--rpx));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(28 * var(--rpx));
  box-sizing: border-box;
  box-shadow: var(--shadow);
}

.run-start-quick-confirm-title {
  margin: 0 0 calc(16 * var(--rpx));
  font-size: calc(44 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark);
  text-align: center;
}

.run-start-quick-confirm-message {
  margin: 0 0 calc(28 * var(--rpx));
  font-size: calc(30 * var(--rpx));
  line-height: 1.45;
  color: var(--text-muted);
  text-align: center;
}

.run-start-quick-confirm-actions {
  display: flex;
  flex-direction: column;
  gap: calc(14 * var(--rpx));
}

.run-start-quick-confirm-btn {
  width: 100%;
  min-height: calc(88 * var(--rpx));
  border: none;
  border-radius: calc(12 * var(--rpx));
  font-size: calc(32 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
}

.run-start-quick-confirm-btn--primary {
  background: #5a8fb8;
  color: #fff;
}

.run-start-quick-confirm-btn--new-run {
  background: #6a9e5c;
  color: #fff;
}

.run-start-quick-confirm-btn--secondary {
  background: var(--panel-muted);
  color: var(--text-dark);
}

.run-start-quick-confirm-btn:hover {
  filter: brightness(1.05);
}

.run-start-quick-confirm-btn:active {
  filter: brightness(0.92);
}

.run-start-quick-confirm-enter-active,
.run-start-quick-confirm-leave-active {
  transition: opacity calc(0.28s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
}

.run-start-quick-confirm-enter-active .run-start-quick-confirm-card,
.run-start-quick-confirm-leave-active .run-start-quick-confirm-card {
  transition:
    opacity calc(0.32s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out),
    transform calc(0.32s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
}

.run-start-quick-confirm-enter-from,
.run-start-quick-confirm-leave-to {
  opacity: 0;
}

.run-start-quick-confirm-enter-from .run-start-quick-confirm-card,
.run-start-quick-confirm-leave-to .run-start-quick-confirm-card {
  opacity: 0;
  transform: scale(0.96) translateY(calc(10 * var(--rpx)));
}
</style>
