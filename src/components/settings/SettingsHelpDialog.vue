<template>
  <Transition name="settings-help-dialog">
    <div
      v-if="open"
      class="settings-help-dialog-backdrop"
      role="presentation"
      @click.self="emit('close')"
    >
      <div class="settings-help-dialog-scrim" aria-hidden="true" />
      <div
        class="settings-help-dialog-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : textId"
        @click.stop
      >
        <SettingsControlDemo v-if="activeDemoVariant" :variant="activeDemoVariant" />
        <h3 v-if="title" :id="titleId" class="settings-help-dialog-title">{{ title }}</h3>
        <div :id="textId" class="settings-help-dialog-body">
          <p
            v-for="(line, idx) in paragraphs"
            :key="idx"
            class="settings-help-dialog-text"
            :class="{ 'settings-help-dialog-text--dim': isParagraphDimmed(idx) }"
          >
            {{ line }}
          </p>
        </div>
        <button type="button" class="settings-help-dialog-btn" @click="emit('close')">知道了</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import SettingsControlDemo from "./SettingsControlDemo.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "" },
  paragraphs: { type: Array, default: () => [] },
  /** @type {import('vue').PropType<'mark' | 'swap' | 'markOnSwap' | ''>} */
  demoVariant: { type: String, default: "" },
});

const emit = defineEmits(["close"]);

const titleId = "settings-help-dialog-title";
const textId = "settings-help-dialog-text";

/** 与 SettingsControlDemo 单段循环时长大致对齐 */
const DUAL_PHASE_MS = 5200;

/** @type {import('vue').Ref<number>} */
const helpPhase = ref(0);
/** @type {ReturnType<typeof setInterval> | null} */
let helpPhaseTimer = null;

/** 标记按钮说明：角标 / 快速选入拼词 两段动画交替 */
const isMarkDualPhase = computed(() => props.demoVariant === "mark");

const activeDemoVariant = computed(() => {
  if (!props.demoVariant) return "";
  if (isMarkDualPhase.value) {
    return helpPhase.value === 0 ? "mark" : "markOnSwapMark";
  }
  if (props.demoVariant === "markOnSwap") {
    return "markOnSwapSwap";
  }
  return props.demoVariant;
});

/** @param {number} idx */
function isParagraphDimmed(idx) {
  if (!isMarkDualPhase.value || props.paragraphs.length < 2) return false;
  return idx !== helpPhase.value;
}

function stopHelpPhaseCycle() {
  if (helpPhaseTimer != null) {
    clearInterval(helpPhaseTimer);
    helpPhaseTimer = null;
  }
}

function startHelpPhaseCycle() {
  stopHelpPhaseCycle();
  helpPhase.value = 0;
  helpPhaseTimer = setInterval(() => {
    helpPhase.value = (helpPhase.value + 1) % 2;
  }, DUAL_PHASE_MS);
}

watch(
  () => props.open && isMarkDualPhase.value,
  (active) => {
    if (active) startHelpPhaseCycle();
    else stopHelpPhaseCycle();
  },
  { immediate: true },
);

onUnmounted(() => {
  stopHelpPhaseCycle();
});
</script>

<style scoped>
.settings-help-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
  box-sizing: border-box;
}

.settings-help-dialog-scrim {
  position: absolute;
  inset: 0;
  background: rgba(48, 62, 78, 0.72);
  pointer-events: none;
}

.settings-help-dialog-card {
  position: relative;
  z-index: 1;
  width: min(100%, calc(480 * var(--rpx)));
  max-height: calc(100% - 48 * var(--rpx));
  overflow-y: auto;
  padding: calc(20 * var(--rpx)) calc(20 * var(--rpx)) calc(18 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  background: var(--card-bright, #faf8ef);
  box-shadow: var(--shadow);
  box-sizing: border-box;
  text-align: center;
}

.settings-help-dialog-title {
  margin: calc(16 * var(--rpx)) 0 calc(8 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  font-weight: 800;
  line-height: 1.3;
  color: var(--text-dark, #3c3a32);
  text-wrap: balance;
}

.settings-help-dialog-body {
  margin-top: calc(14 * var(--rpx));
}

.settings-help-dialog-text {
  margin: 0 auto;
  max-width: calc(360 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  line-height: 1.45;
  color: var(--text-dark, #3c3a32);
  text-wrap: balance;
  transition: opacity calc(0.35s / var(--anim-speed-scale, 1)) ease;
}

.settings-help-dialog-text + .settings-help-dialog-text {
  margin-top: calc(12 * var(--rpx));
}

.settings-help-dialog-text--dim {
  opacity: 0.38;
}

.settings-help-dialog-btn {
  width: 100%;
  margin-top: calc(18 * var(--rpx));
  border: none;
  border-radius: calc(8 * var(--rpx));
  padding: calc(12 * var(--rpx)) calc(16 * var(--rpx));
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  color: var(--text-dark, #3c3a32);
  background: var(--card, #eee4da);
  box-shadow: var(--shadow);
}

.settings-help-dialog-btn:hover {
  filter: brightness(1.05);
}

.settings-help-dialog-btn:active {
  filter: brightness(0.92);
}

.settings-help-dialog-enter-active,
.settings-help-dialog-leave-active {
  transition: opacity calc(0.18s / var(--anim-speed-scale, 1)) ease-out;
}

.settings-help-dialog-enter-active .settings-help-dialog-card,
.settings-help-dialog-leave-active .settings-help-dialog-card {
  transition:
    opacity calc(0.18s / var(--anim-speed-scale, 1)) ease-out,
    transform calc(0.18s / var(--anim-speed-scale, 1)) ease-out;
}

.settings-help-dialog-enter-from,
.settings-help-dialog-leave-to {
  opacity: 0;
}

.settings-help-dialog-enter-from .settings-help-dialog-card,
.settings-help-dialog-leave-to .settings-help-dialog-card {
  opacity: 0;
  transform: translateY(calc(10 * var(--rpx)));
}

</style>
