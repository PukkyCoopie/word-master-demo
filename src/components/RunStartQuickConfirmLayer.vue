<template>
  <Transition name="run-start-quick-confirm">
    <div
      v-if="open"
      class="run-start-quick-confirm-backdrop portal-overlay-fill"
      :style="backdropStackStyle"
      role="presentation"
      @click.self="onBackdropSelfClick"
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
  title: { type: String, default: "提示" },
  message: { type: String, required: true },
  confirmLabel: { type: String, default: "确定" },
  cancelLabel: { type: String, default: "取消" },
  backdropDismiss: { type: Boolean, default: false },
});

const emit = defineEmits(["confirm", "cancel"]);

const titleId = "run-start-quick-confirm-title";
const stackZ = ref(0);
const backdropSelfCloseGuard = createBackdropSelfCloseGuard();

const backdropStackStyle = computed(() =>
  stackZ.value > 0 ? { zIndex: stackZ.value } : {},
);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      stackZ.value = bumpOverlayZ();
      backdropSelfCloseGuard.arm();
    }
  },
  { immediate: true },
);

function onBackdropSelfClick() {
  if (!props.backdropDismiss) return;
  backdropSelfCloseGuard.onBackdropSelfClick(() => emit("cancel"));
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

.run-start-quick-confirm-btn--secondary {
  background: var(--panel-muted);
  color: var(--text-dark);
}
</style>
