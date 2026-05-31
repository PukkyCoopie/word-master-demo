<template>
  <div class="run-start-preset-wrap">
      <div class="run-start-preset-browser" role="group" aria-label="选择预设">
        <button
          type="button"
          class="run-start-preset-cycle-arrow"
          aria-label="上一个预设"
          @click="onPrev"
        >
          <i class="ri-arrow-left-s-line" aria-hidden="true" />
        </button>

        <div class="run-start-preset-content">
          <button
            v-if="isCurrentLocked"
            type="button"
            class="run-start-preset-status-badge run-start-preset-status-badge--lock"
            aria-label="预设未解锁"
            @click.stop="openStatusHint('lock')"
          >
            <i class="ri-lock-fill" aria-hidden="true" />
          </button>
          <button
            v-else-if="isCurrentWon"
            type="button"
            class="run-start-preset-status-badge run-start-preset-status-badge--won"
            aria-label="已用本预设通关"
            @click.stop="openStatusHint('won')"
          >
            <i class="ri-check-line" aria-hidden="true" />
          </button>
          <div
            class="run-start-preset-inner"
            :class="{ 'run-start-preset-inner--locked': isCurrentLocked }"
          >
            <div class="run-start-preset-head" aria-live="polite">
              <span class="run-start-preset-emoji" aria-hidden="true">{{ currentDef.emoji }}</span>
              <span class="run-start-preset-name">{{ currentDef.name }}</span>
            </div>
            <div class="run-start-preset-desc-slot">
              <PresetDescRichText
                :key="currentDef.id"
                :description="currentDef.description"
                :size="descLayoutTier"
                @preview-voucher="onPreviewVoucher"
                @preview-wildcard="onPreviewWildcard"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          class="run-start-preset-cycle-arrow"
          aria-label="下一个预设"
          @click="onNext"
        >
          <i class="ri-arrow-right-s-line" aria-hidden="true" />
        </button>
      </div>

      <div class="run-start-preset-pagination" role="navigation" aria-label="预设分页">
        <button
          v-for="(preset, i) in RUN_PRESET_DEFINITIONS"
          :key="preset.id"
          type="button"
          class="run-start-preset-dot"
          :class="{
            'run-start-preset-dot--active': i === browseIndex,
            'run-start-preset-dot--locked': !isPresetIndexUnlocked(i),
          }"
          :aria-label="`${preset.name}${isPresetIndexUnlocked(i) ? '' : '（未解锁）'}`"
          :aria-current="i === browseIndex ? 'true' : undefined"
          @click="goToIndex(i)"
        />
      </div>
  </div>

  <TreasureDetailLayer
    v-if="voucherDetail"
    :treasure="voucherDetail"
    mode="offer"
    :wallet-amount="0"
    @close="voucherDetail = null"
  />

  <TileDetailLayer
    v-if="wildcardDetailOpen"
    :payload="wildcardDetailPayload"
    @close="wildcardDetailOpen = false"
  />

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
          aria-labelledby="run-start-preset-hint-title"
          @click.stop
        >
          <p id="run-start-preset-hint-title" class="run-start-preset-hint-text">{{ statusHintText }}</p>
          <button type="button" class="run-start-preset-hint-btn" @click="closeStatusHint">知道了</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { getRunPresetDef, getPresetDescriptionLayoutTier, normalizeRunPresetId, RUN_PRESET_DEFINITIONS } from "../game/runPresetDefinitions.js";
import {
  getLastSelectedPresetId,
  getPresetIdAtBrowseIndex,
  getPresetIndexById,
  isPresetUnlocked,
  isPresetWonWith,
  stepPresetBrowseIndex,
} from "../game/runPresetProgress.js";
import { normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import PresetDescRichText from "./PresetDescRichText.vue";
import TreasureDetailLayer from "./TreasureDetailLayer.vue";
import TileDetailLayer from "./TileDetailLayer.vue";

const props = defineProps({
  modelValue: { type: String, default: "preset_01" },
  slotCareer: { type: Object, default: null },
});

const emit = defineEmits(["update:modelValue"]);

const normalizedCareer = computed(() => normalizeSlotCareerStats(props.slotCareer));
const presetTotal = RUN_PRESET_DEFINITIONS.length;

const browseIndex = ref(0);

watch(
  () => props.modelValue,
  (id) => {
    browseIndex.value = getPresetIndexById(id);
  },
  { immediate: true },
);

const currentDef = computed(() => getRunPresetDef(getPresetIdAtBrowseIndex(browseIndex.value)));

const isCurrentLocked = computed(() => !isPresetUnlocked(currentDef.value.id, normalizedCareer.value));
const isCurrentWon = computed(() => isPresetWonWith(currentDef.value.id, normalizedCareer.value));

/** @type {import('vue').Ref<'lock' | 'won' | null>} */
const statusHint = ref(null);
const hintStackZ = ref(0);
const hintBackdropStackStyle = computed(() => (hintStackZ.value > 0 ? { zIndex: hintStackZ.value } : undefined));
const statusHintText = computed(() => {
  if (statusHint.value === "lock") return "使用其他预设取得胜利以解锁";
  if (statusHint.value === "won") return "你已用本预设通关过游戏";
  return "";
});

/** @param {'lock' | 'won'} kind */
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

const descLayoutTier = computed(() => {
  const tier = getPresetDescriptionLayoutTier(currentDef.value);
  return tier === "normal" ? "medium" : "compact";
});

/** @type {import('vue').Ref<object | null>} */
const voucherDetail = ref(null);
const wildcardDetailOpen = ref(false);
const wildcardDetailPayload = {
  letter: "?",
  rarity: "common",
  materialId: "wildcard",
  accessoryId: null,
  treasureAccessoryId: null,
  tileScoreBonus: 0,
  tileMultBonus: 0,
  hideRarityGem: true,
};

/** @param {number} index */
function isPresetIndexUnlocked(index) {
  const id = getPresetIdAtBrowseIndex(index);
  return isPresetUnlocked(id, normalizedCareer.value);
}

function setBrowseIndex(index) {
  browseIndex.value = Math.max(0, Math.min(presetTotal - 1, Math.floor(Number(index) || 0)));
  emit("update:modelValue", getPresetIdAtBrowseIndex(browseIndex.value));
}

function onPrev() {
  setBrowseIndex(stepPresetBrowseIndex(browseIndex.value, -1));
}

function onNext() {
  setBrowseIndex(stepPresetBrowseIndex(browseIndex.value, 1));
}

/** @param {number} index */
function goToIndex(index) {
  setBrowseIndex(index);
}

/** @param {{ detail: object }} payload */
function onPreviewVoucher(payload) {
  voucherDetail.value = payload.detail;
}

function onPreviewWildcard() {
  wildcardDetailOpen.value = true;
}

defineExpose({
  resetToDefault() {
    const id = getLastSelectedPresetId(normalizedCareer.value);
    browseIndex.value = getPresetIndexById(id);
    emit("update:modelValue", normalizeRunPresetId(id));
  },
  isCurrentLocked,
});
</script>

<style scoped>
.run-start-preset-wrap {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
}

.run-start-preset-browser {
  display: flex;
  align-items: stretch;
  gap: calc(6 * var(--rpx));
}

.run-start-preset-cycle-arrow {
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

.run-start-preset-cycle-arrow:active {
  filter: brightness(0.94);
}

.run-start-preset-content {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  height: calc(142 * var(--rpx));
  min-height: calc(142 * var(--rpx));
  max-height: calc(142 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card, #eee4da);
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}

.run-start-preset-inner--locked {
  opacity: 0.45;
}

.run-start-preset-status-badge {
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
  line-height: 1;
  color: #fff;
  cursor: pointer;
  box-shadow: var(--shadow);
}

.run-start-preset-status-badge--lock {
  background: #c94a4a;
}

.run-start-preset-status-badge--won {
  background: #4a9c6d;
}

.run-start-preset-status-badge:active {
  filter: brightness(0.92);
}

.run-start-preset-inner {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(8 * var(--rpx));
}

.run-start-preset-head {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: calc(6 * var(--rpx));
  flex-shrink: 0;
  max-width: 100%;
  line-height: 1.2;
}

.run-start-preset-emoji {
  font-size: calc(28 * var(--rpx));
  line-height: 1;
}

.run-start-preset-name {
  font-size: calc(24 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  line-height: 1.2;
}

.run-start-preset-desc-slot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  max-height: calc(88 * var(--rpx));
  overflow: hidden;
}

.run-start-preset-desc-slot :deep(.preset-desc-rich-text) {
  font-size: calc(22 * var(--rpx));
  line-height: 1.4;
}

.run-start-preset-desc-slot :deep(.preset-desc-rich-text--medium) {
  font-size: calc(20 * var(--rpx));
  line-height: 1.38;
}

.run-start-preset-desc-slot :deep(.preset-desc-rich-text--compact) {
  font-size: calc(18 * var(--rpx));
  line-height: 1.34;
}

.run-start-preset-desc-slot :deep(.preset-desc-chip) {
  font-size: calc(17 * var(--rpx));
  padding: calc(1 * var(--rpx)) calc(6 * var(--rpx));
}

.run-start-preset-desc-slot :deep(.preset-desc-rich-text--compact .preset-desc-chip) {
  font-size: calc(15 * var(--rpx));
}

.run-start-preset-pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: calc(6 * var(--rpx));
  max-width: 100%;
}

.run-start-preset-dot {
  width: calc(10 * var(--rpx));
  height: calc(10 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(60, 58, 50, 0.22);
  cursor: pointer;
}

.run-start-preset-dot--active {
  background: var(--text-dark, #3c3a32);
  transform: scale(1.15);
}

.run-start-preset-dot--locked {
  background: rgba(60, 58, 50, 0.12);
  box-shadow: inset 0 0 0 calc(1.5 * var(--rpx)) rgba(60, 58, 50, 0.28);
}

.run-start-preset-dot--active.run-start-preset-dot--locked {
  background: rgba(60, 58, 50, 0.45);
}

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
