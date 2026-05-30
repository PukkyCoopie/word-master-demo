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

        <div
          class="run-start-preset-content"
          :class="{ 'run-start-preset-content--locked': isCurrentLocked }"
        >
          <div class="run-start-preset-inner">
            <div class="run-start-preset-head" aria-live="polite">
              <span class="run-start-preset-emoji" aria-hidden="true">{{ currentDef.emoji }}</span>
              <span class="run-start-preset-name">{{ currentDef.name }}</span>
              <i
                v-if="isCurrentLocked"
                class="ri-lock-fill run-start-preset-lock-icon"
                aria-hidden="true"
              />
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
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { getRunPresetDef, getPresetDescriptionLayoutTier, normalizeRunPresetId, RUN_PRESET_DEFINITIONS } from "../game/runPresetDefinitions.js";
import {
  getLastSelectedPresetId,
  getPresetIdAtBrowseIndex,
  getPresetIndexById,
  isPresetUnlocked,
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

.run-start-preset-content--locked {
  opacity: 0.45;
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

.run-start-preset-lock-icon {
  font-size: calc(20 * var(--rpx));
  color: rgba(60, 58, 50, 0.55);
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
</style>
