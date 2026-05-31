<template>
  <div class="run-start-difficulty-wrap">
    <div class="run-start-difficulty-browser" role="group" aria-label="选择难度">
      <button
        type="button"
        class="run-start-difficulty-cycle-arrow"
        aria-label="上一个难度"
        @click="onPrev"
      >
        <i class="ri-arrow-left-s-line" aria-hidden="true" />
      </button>

      <div ref="contentEl" class="run-start-difficulty-content">
        <UnlockFreshPill v-if="showFreshBadge" />
        <button
          v-if="isCurrentLocked"
          type="button"
          class="run-start-difficulty-status-badge run-start-difficulty-status-badge--lock"
          aria-label="难度未解锁"
          @click.stop="openStatusHint('lock')"
        >
          <i class="ri-lock-fill" aria-hidden="true" />
        </button>
        <div
          class="run-start-difficulty-inner"
          :class="{ 'run-start-difficulty-inner--locked': isCurrentLocked }"
        >
          <div class="run-start-difficulty-head" aria-live="polite">
            <DifficultyPill :index="browseIndex" />
          </div>
          <div class="run-start-difficulty-desc-slot">
            <DifficultyDescText :description="currentDef.description" />
            <p v-if="showStackHint" class="run-start-difficulty-desc-stack">之前的难度也会生效</p>
          </div>
        </div>
      </div>

      <div class="run-start-difficulty-pagination" role="navigation" aria-label="难度分页">
        <button
          v-for="def in RUN_DIFFICULTY_DEFINITIONS"
          :key="def.index"
          type="button"
          class="run-start-difficulty-bar"
          :class="{
            'run-start-difficulty-bar--active': def.index === browseIndex,
            'run-start-difficulty-bar--locked': !isDifficultyIndexUnlocked(def.index),
          }"
          :style="{ backgroundColor: def.color }"
          :aria-label="`${def.label}${isDifficultyIndexUnlocked(def.index) ? '' : '（未解锁）'}`"
          :aria-current="def.index === browseIndex ? 'true' : undefined"
          @click="goToIndex(def.index)"
        />
      </div>

      <button
        type="button"
        class="run-start-difficulty-cycle-arrow"
        aria-label="下一个难度"
        @click="onNext"
      >
        <i class="ri-arrow-right-s-line" aria-hidden="true" />
      </button>
    </div>
  </div>

  <Teleport defer to="#game-view-portal-frame">
    <Transition name="run-start-preset-hint">
      <div
        v-if="statusHint"
        class="run-start-preset-hint-backdrop portal-overlay-fill"
        role="presentation"
        :style="hintBackdropStackStyle"
        @click.self="closeStatusHint"
      >
        <div class="run-start-preset-hint-scrim" aria-hidden="true" />
        <div
          class="run-start-preset-hint-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="run-start-difficulty-hint-title"
          @click.stop
        >
          <p id="run-start-difficulty-hint-title" class="run-start-preset-hint-text">{{ statusHintText }}</p>
          <button type="button" class="run-start-preset-hint-btn" @click="closeStatusHint">知道了</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import {
  getRunDifficultyDef,
  normalizeRunDifficultyIndex,
  RUN_DIFFICULTY_DEFINITIONS,
} from "../game/runDifficultyDefinitions.js";
import {
  getLastSelectedDifficultyBrowseIndex,
  isDifficultyUnlocked,
  setLastSelectedDifficultyIndex,
  stepDifficultyBrowseIndex,
} from "../game/runDifficultyProgress.js";
import { normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import {
  playRunStartContentJellySwap,
  resetRunStartContentJellyTransform,
} from "../utils/runStartContentJellyFx.js";
import DifficultyPill from "./DifficultyPill.vue";
import DifficultyDescText from "./DifficultyDescText.vue";
import UnlockFreshPill from "./UnlockFreshPill.vue";

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  slotCareer: { type: Object, default: null },
  readonly: { type: Boolean, default: false },
  freshUnlockDifficultyIndices: { type: Array, default: () => [] },
});

const emit = defineEmits(["update:modelValue"]);

const normalizedCareer = computed(() => normalizeSlotCareerStats(props.slotCareer));
const browseIndex = ref(0);
/** @type {import('vue').Ref<HTMLElement | null>} */
const contentEl = ref(null);
/** @type {import('gsap').core.Timeline | null} */
let contentJellyTl = null;
/** @type {import('vue').Ref<Set<number>>} */
const dismissedFreshDifficultyIndices = ref(new Set());

watch(
  () => props.modelValue,
  (v) => {
    browseIndex.value = normalizeRunDifficultyIndex(v);
  },
  { immediate: true },
);

watch(browseIndex, (_newIx, oldIx) => {
  if (oldIx === undefined) return;
  dismissedFreshDifficultyIndices.value = new Set([...dismissedFreshDifficultyIndices.value, oldIx]);
});

const currentDef = computed(() => getRunDifficultyDef(browseIndex.value));
const isCurrentLocked = computed(() => !isDifficultyUnlocked(browseIndex.value, normalizedCareer.value));
const showStackHint = computed(() => browseIndex.value > 0);

const showFreshBadge = computed(() => {
  const ix = browseIndex.value;
  if (dismissedFreshDifficultyIndices.value.has(ix)) return false;
  return props.freshUnlockDifficultyIndices.some((n) => normalizeRunDifficultyIndex(n) === ix);
});

/** @type {import('vue').Ref<'lock' | null>} */
const statusHint = ref(null);
const hintStackZ = ref(0);
const hintBackdropStackStyle = computed(() => (hintStackZ.value > 0 ? { zIndex: hintStackZ.value } : undefined));
const statusHintText = computed(() => {
  if (statusHint.value === "lock") return "完成上一难度以解锁";
  return "";
});

/** @param {'lock'} kind */
function openStatusHint(kind) {
  statusHint.value = kind;
  nextTick(() => {
    hintStackZ.value = bumpOverlayZ();
  });
}

function closeStatusHint() {
  statusHint.value = null;
  hintStackZ.value = 0;
}

/** @param {number} index */
function isDifficultyIndexUnlocked(index) {
  return isDifficultyUnlocked(index, normalizedCareer.value);
}

function setBrowseIndex(index, direction = 1) {
  if (props.readonly) return;
  const clamped = normalizeRunDifficultyIndex(index);
  if (clamped === browseIndex.value && !contentJellyTl?.isActive()) return;

  const dir = direction >= 0 ? 1 : -1;
  let swapped = false;
  const applySwap = () => {
    if (swapped) return;
    swapped = true;
    browseIndex.value = clamped;
    emit("update:modelValue", browseIndex.value);
  };

  contentJellyTl?.kill();
  resetRunStartContentJellyTransform(contentEl.value);

  contentJellyTl = playRunStartContentJellySwap(contentEl.value, dir, applySwap);
  if (!contentJellyTl) {
    applySwap();
    return;
  }

  contentJellyTl.eventCallback("onInterrupt", () => {
    applySwap();
    resetRunStartContentJellyTransform(contentEl.value);
  });
}

function onPrev() {
  if (props.readonly) return;
  setBrowseIndex(stepDifficultyBrowseIndex(browseIndex.value, -1), -1);
}

function onNext() {
  if (props.readonly) return;
  setBrowseIndex(stepDifficultyBrowseIndex(browseIndex.value, 1), 1);
}

/** @param {number} index */
function goToIndex(index) {
  if (props.readonly) return;
  const clamped = normalizeRunDifficultyIndex(index);
  const direction = clamped >= browseIndex.value ? 1 : -1;
  setBrowseIndex(clamped, direction);
}

onBeforeUnmount(() => {
  contentJellyTl?.kill();
  resetRunStartContentJellyTransform(contentEl.value);
});

defineExpose({
  resetToDefault() {
    const ix = getLastSelectedDifficultyBrowseIndex(normalizedCareer.value);
    browseIndex.value = ix;
    emit("update:modelValue", ix);
  },
  isCurrentLocked,
  persistSelection(career) {
    setLastSelectedDifficultyIndex(career, browseIndex.value);
  },
});
</script>

<style scoped>
.run-start-difficulty-wrap {
  width: 100%;
}

.run-start-difficulty-browser {
  display: flex;
  align-items: stretch;
  gap: calc(6 * var(--rpx));
}

.run-start-difficulty-cycle-arrow {
  flex-shrink: 0;
  align-self: stretch;
  width: calc(44 * var(--rpx));
  min-height: calc(44 * var(--rpx));
  border: none;
  border-radius: var(--radius);
  background: var(--card, #eee4da);
  color: var(--text-dark, #3c3a32);
  font-size: calc(28 * var(--rpx));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.run-start-difficulty-cycle-arrow:active {
  filter: brightness(0.94);
}

.run-start-difficulty-content {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: calc(152 * var(--rpx));
  min-height: calc(152 * var(--rpx));
  max-height: calc(152 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card, #eee4da);
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  transform-origin: 50% 50%;
}

.run-start-difficulty-inner {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(8 * var(--rpx));
}

.run-start-difficulty-inner--locked {
  opacity: 0.45;
}

.run-start-difficulty-status-badge {
  position: absolute;
  top: calc(8 * var(--rpx));
  right: calc(8 * var(--rpx));
  z-index: 2;
  width: calc(32 * var(--rpx));
  height: calc(32 * var(--rpx));
  border: none;
  border-radius: calc(8 * var(--rpx));
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(18 * var(--rpx));
  color: #fff;
  cursor: pointer;
  box-shadow: var(--shadow);
  background: #c94a4a;
}

.run-start-difficulty-head {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.run-start-difficulty-desc-slot {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(4 * var(--rpx));
  width: 100%;
  min-width: 0;
  max-height: calc(98 * var(--rpx));
  overflow: hidden;
}

.run-start-difficulty-desc-stack {
  margin: 0;
  font-size: calc(19 * var(--rpx));
  line-height: 1.3;
  color: rgba(60, 58, 50, 0.62);
}

.run-start-difficulty-pagination {
  flex-shrink: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column-reverse;
  justify-content: center;
  gap: calc(3 * var(--rpx));
  padding: calc(8 * var(--rpx)) calc(7 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card, #eee4da);
  box-sizing: border-box;
}

.run-start-difficulty-bar {
  width: calc(18 * var(--rpx));
  height: calc(13 * var(--rpx));
  border: none;
  border-radius: calc(4 * var(--rpx));
  padding: 0;
  cursor: pointer;
  opacity: 0.55;
  box-shadow: inset 0 0 0 calc(1 * var(--rpx)) rgba(0, 0, 0, 0.08);
}

.run-start-difficulty-bar--active {
  opacity: 1;
  box-shadow:
    inset 0 0 0 calc(1.5 * var(--rpx)) rgba(255, 255, 255, 0.85),
    0 0 0 calc(1.5 * var(--rpx)) rgba(60, 58, 50, 0.35);
}
</style>

<!-- Teleport 到 portal，须非 scoped 才能生效 -->
<style>
.run-start-preset-hint-backdrop {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
}

.run-start-preset-hint-scrim {
  position: absolute;
  inset: 0;
  background: rgba(48, 62, 78, 0.72);
  pointer-events: none;
}

.run-start-preset-hint-card {
  position: relative;
  z-index: 1;
  width: min(100%, calc(420 * var(--rpx)));
  padding: calc(24 * var(--rpx)) calc(22 * var(--rpx)) calc(20 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  background: var(--card-bright, #faf8ef);
  box-shadow: var(--shadow);
  box-sizing: border-box;
  text-align: center;
}

.run-start-preset-hint-text {
  margin: 0 0 calc(20 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  line-height: 1.45;
  color: var(--text-dark, #3c3a32);
}

.run-start-preset-hint-btn {
  border: none;
  border-radius: var(--radius);
  padding: calc(12 * var(--rpx)) calc(28 * var(--rpx));
  font-family: inherit;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: #f9f6f2;
  background: #5a8fb8;
  cursor: pointer;
  box-shadow: var(--shadow);
}

.run-start-preset-hint-btn:active {
  filter: brightness(0.92);
}

.run-start-preset-hint-enter-active,
.run-start-preset-hint-leave-active {
  transition: opacity 0.18s ease-out;
}

.run-start-preset-hint-enter-active .run-start-preset-hint-card,
.run-start-preset-hint-leave-active .run-start-preset-hint-card {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}

.run-start-preset-hint-enter-from,
.run-start-preset-hint-leave-to {
  opacity: 0;
}

.run-start-preset-hint-enter-from .run-start-preset-hint-card,
.run-start-preset-hint-leave-to .run-start-preset-hint-card {
  opacity: 0;
  transform: translateY(calc(10 * var(--rpx)));
}
</style>
