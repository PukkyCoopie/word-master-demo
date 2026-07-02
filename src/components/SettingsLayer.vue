<template>
  <Transition name="settings-layer">
    <div
      v-if="open"
      class="settings-layer-backdrop"
      :style="backdropStackStyle"
      role="presentation"
    >
      <div class="settings-layer-scrim" aria-hidden="true" />
      <div
        class="settings-layer-card"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <h2 :id="titleId" class="settings-layer-title">设置</h2>

        <SegmentTabControl
          ref="settingsTabsRef"
          class="settings-layer-tabs-host"
          :model-value="activeTab"
          :options="settingsTabOptions"
          variant="settings-layer"
          aria-label="设置分组"
          fill
          :haptic="false"
          reposition-instant
          @update:model-value="setActiveTab"
        />

        <div class="settings-layer-body">
          <div class="settings-layer-panels">
            <section
              role="tabpanel"
              class="settings-layer-panel"
              :class="{ 'settings-layer-panel--active': activeTab === 'ui' }"
              :aria-hidden="activeTab !== 'ui'"
              :inert="activeTab !== 'ui'"
            >
              <div class="settings-layer-list">
                <div v-if="showDisplayLayoutModeSetting" class="settings-row settings-row--segment">
                  <span class="settings-row-label">显示模式</span>
                  <SettingsSegmentControl
                    :options="DISPLAY_LAYOUT_MODE_OPTIONS"
                    :model-value="displayLayoutMode"
                    aria-label="显示模式"
                    @update:model-value="onDisplayLayoutModeChange"
                  />
                </div>

                <div class="settings-row settings-row--segment">
                  <span class="settings-row-label">动画速度</span>
                  <SettingsSegmentControl
                    :options="ANIMATION_SPEED_OPTIONS"
                    :model-value="animationSpeedTier"
                    aria-label="动画速度"
                    @update:model-value="onAnimationSpeedChange"
                  />
                </div>

                <label
                  class="settings-row"
                  :class="{ 'settings-row--disabled': !materialAnimationSettingSupported }"
                >
                  <span class="settings-row-label-group">
                    <span class="settings-row-label">材质动画</span>
                    <span
                      v-if="!materialAnimationSettingSupported"
                      class="settings-row-hint"
                    >当前设备不支持</span>
                  </span>
                  <button
                    type="button"
                    class="settings-toggle"
                    role="switch"
                    :aria-checked="materialAnimationToggleChecked"
                    :disabled="!materialAnimationSettingSupported"
                    @click="onToggleMaterialAnimation"
                  >
                    <span
                      class="settings-toggle-track"
                      :class="{ 'settings-toggle-track--on': materialAnimationToggleChecked }"
                    >
                      <span class="settings-toggle-thumb" />
                    </span>
                  </button>
                </label>

                <div class="settings-row settings-row--segment">
                  <span class="settings-row-label">字母样式</span>
                  <SettingsSegmentControl
                    :options="LETTER_CASE_OPTIONS"
                    :model-value="letterCase"
                    aria-label="字母样式"
                    @update:model-value="onLetterCaseChange"
                  />
                </div>

                <div class="settings-row settings-row--segment">
                  <span class="settings-row-label-group">
                    <span class="settings-row-label">确认按钮位置</span>
                    <SettingsHelpButton help-id="confirmButtonSide" aria-label="确认按钮位置说明" />
                  </span>
                  <SettingsSegmentControl
                    :options="CONFIRM_BUTTON_SIDE_OPTIONS"
                    :model-value="confirmButtonSide"
                    aria-label="确认按钮位置"
                    @update:model-value="onConfirmButtonSideChange"
                  />
                </div>
              </div>
            </section>
            <section
              role="tabpanel"
              class="settings-layer-panel"
              :class="{ 'settings-layer-panel--active': activeTab === 'gameplay' }"
              :aria-hidden="activeTab !== 'gameplay'"
              :inert="activeTab !== 'gameplay'"
            >
              <div class="settings-layer-list">
                <label class="settings-row">
                  <span class="settings-row-label">允许拼写缩写</span>
                  <button
                    type="button"
                    class="settings-toggle"
                    role="switch"
                    :aria-checked="allowAbbrev"
                    @click="onToggleAbbrev"
                  >
                    <span class="settings-toggle-track" :class="{ 'settings-toggle-track--on': allowAbbrev }">
                      <span class="settings-toggle-thumb" />
                    </span>
                  </button>
                </label>

                <div class="settings-row settings-row--segment">
                  <span class="settings-row-label">字母Q</span>
                  <SettingsSegmentControl
                    :options="LETTER_Q_MODE_OPTIONS"
                    :model-value="letterQMode"
                    aria-label="字母Q"
                    @update:model-value="onLetterQModeChange"
                  />
                </div>

                <div class="settings-row settings-row--segment">
                  <span class="settings-row-label-group">
                    <span class="settings-row-label">释义</span>
                    <span
                      class="settings-row-label-btn-chip settings-row-label-btn-chip--definition"
                      aria-hidden="true"
                    >
                      <i class="ri-translate-2" />
                    </span>
                  </span>
                  <SettingsSegmentControl
                    :options="WORD_DEFINITION_MODE_OPTIONS"
                    :model-value="wordDefinitionMode"
                    aria-label="释义显示"
                    @update:model-value="onWordDefinitionModeChange"
                  />
                </div>

                <div class="settings-row settings-row--segment">
                  <span class="settings-row-label-group">
                    <span class="settings-row-label">提示</span>
                    <span
                      class="settings-row-label-btn-chip settings-row-label-btn-chip--hint"
                      aria-hidden="true"
                    >
                      <i class="ri-lightbulb-line" />
                    </span>
                  </span>
                  <SettingsSegmentControl
                    :options="WORD_HINT_MODE_OPTIONS"
                    :model-value="wordHintMode"
                    aria-label="提示"
                    @update:model-value="onWordHintModeChange"
                  />
                </div>
              </div>
            </section>

            <section
              role="tabpanel"
              class="settings-layer-panel"
              :class="{ 'settings-layer-panel--active': activeTab === 'controls' }"
              :aria-hidden="activeTab !== 'controls'"
              :inert="activeTab !== 'controls'"
            >
              <div class="settings-layer-list">
                <label class="settings-row">
                  <span class="settings-row-label-group">
                    <span class="settings-row-label">标记按钮</span>
                    <span
                      class="settings-row-label-btn-chip settings-row-label-btn-chip--mark"
                      aria-hidden="true"
                    >
                      <i class="ri-bookmark-line" />
                    </span>
                    <SettingsHelpButton help-id="mark" aria-label="标记按钮说明" />
                  </span>
                  <button
                    type="button"
                    class="settings-toggle"
                    role="switch"
                    :aria-checked="markButtonEnabled"
                    @click="onToggleMarkButton"
                  >
                    <span
                      class="settings-toggle-track"
                      :class="{ 'settings-toggle-track--on': markButtonEnabled }"
                    >
                      <span class="settings-toggle-thumb" />
                    </span>
                  </button>
                </label>

                <div
                  class="settings-row settings-row--cycle"
                  :class="{ 'settings-row--disabled': !markButtonEnabled }"
                >
                  <span class="settings-row-label-group">
                    <span class="settings-row-label">对调按钮</span>
                    <span
                      class="settings-row-label-btn-chip settings-row-label-btn-chip--swap"
                      aria-hidden="true"
                    >
                      <i class="ri-arrow-up-down-line" />
                    </span>
                    <SettingsHelpButton help-id="swap" aria-label="对调按钮说明" />
                  </span>
                  <div class="settings-cycle" role="group" aria-label="对调按钮范围">
                    <button
                      type="button"
                      class="settings-cycle-arrow"
                      aria-label="上一项"
                      :disabled="!markButtonEnabled"
                      @click="onSwapModePrev"
                    >
                      <i class="ri-arrow-left-s-line" aria-hidden="true" />
                    </button>
                    <span class="settings-cycle-value" aria-live="polite">
                      <span class="settings-cycle-value-sizer" aria-hidden="true">{{ swapModeSizerLabel }}</span>
                      <span class="settings-cycle-value-text">{{ swapModeLabel }}</span>
                    </span>
                    <button
                      type="button"
                      class="settings-cycle-arrow"
                      aria-label="下一项"
                      :disabled="!markButtonEnabled"
                      @click="onSwapModeNext"
                    >
                      <i class="ri-arrow-right-s-line" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <label
                  class="settings-row"
                  :class="{ 'settings-row--disabled': !markOnSwapSettingEnabled }"
                >
                  <span class="settings-row-label-group">
                    <span class="settings-row-label">对调时标记</span>
                    <SettingsHelpButton help-id="markOnSwap" aria-label="对调时标记说明" />
                  </span>
                  <button
                    type="button"
                    class="settings-toggle"
                    role="switch"
                    :aria-checked="markOnSwap"
                    :disabled="!markOnSwapSettingEnabled"
                    @click="onToggleMarkOnSwap"
                  >
                    <span class="settings-toggle-track" :class="{ 'settings-toggle-track--on': markOnSwap }">
                      <span class="settings-toggle-thumb" />
                    </span>
                  </button>
                </label>

                <label v-if="hapticsAvailable" class="settings-row">
                  <span class="settings-row-label">震动反馈</span>
                  <button
                    type="button"
                    class="settings-toggle"
                    role="switch"
                    :aria-checked="hapticsEnabled"
                    @click="onToggleHaptics"
                  >
                    <span
                      class="settings-toggle-track"
                      :class="{ 'settings-toggle-track--on': hapticsEnabled }"
                    >
                      <span class="settings-toggle-thumb" />
                    </span>
                  </button>
                </label>

                <label class="settings-row">
                  <span class="settings-row-label-group">
                    <span class="settings-row-label">危险操作确认</span>
                    <SettingsHelpButton help-id="highRisk" aria-label="危险操作确认说明" />
                  </span>
                  <button
                    type="button"
                    class="settings-toggle"
                    role="switch"
                    :aria-checked="highRiskSpellConfirmEnabled"
                    @click="onToggleHighRiskSpellConfirm"
                  >
                    <span
                      class="settings-toggle-track"
                      :class="{ 'settings-toggle-track--on': highRiskSpellConfirmEnabled }"
                    >
                      <span class="settings-toggle-thumb" />
                    </span>
                  </button>
                </label>
              </div>
            </section>

            <section
              v-if="showDeveloperTab"
              role="tabpanel"
              class="settings-layer-panel"
              :class="{ 'settings-layer-panel--active': activeTab === 'developer' }"
              :aria-hidden="activeTab !== 'developer'"
              :inert="activeTab !== 'developer'"
            >
              <div class="settings-layer-list">
                <label class="settings-row settings-row--dev-bench">
                  <div class="settings-dev-copy">
                    <span class="settings-row-label">抑制成就与排行榜</span>
                    <p class="settings-dev-hint">开启时，开发者模式下不会解锁成就、也不会上报排行榜</p>
                  </div>
                  <button
                    type="button"
                    class="settings-toggle"
                    role="switch"
                    :aria-checked="devSuppressAchievementsEnabled"
                    @click="onToggleDevSuppressAchievements"
                  >
                    <span
                      class="settings-toggle-track"
                      :class="{ 'settings-toggle-track--on': devSuppressAchievementsEnabled }"
                    >
                      <span class="settings-toggle-thumb" />
                    </span>
                  </button>
                </label>

                <div class="settings-row settings-row--dev-bench">
                  <div class="settings-dev-copy">
                    <span class="settings-row-label">材质性能实验</span>
                    <p class="settings-dev-hint">10 格材质 draw / blit 耗时剖析</p>
                  </div>
                  <button type="button" class="settings-dev-open-btn" @click="onOpenMaterialBench">
                    打开
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="settings-layer-footer">
          <button type="button" class="settings-back-btn" @click="$emit('close')">返回</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, inject, nextTick, ref, watch } from "vue";
import { Capacitor } from "@capacitor/core";
import { settingsOverlayZ } from "../game/overlayStack.js";
import SettingsSegmentControl from "./SettingsSegmentControl.vue";
import SettingsHelpButton from "./settings/SettingsHelpButton.vue";
import { ANIMATION_SPEED_OPTIONS } from "../settings/animationSpeed.js";
import { isMaterialAnimationSettingSupported } from "../settings/materialAnimationAvailability.js";
import { LETTER_CASE_OPTIONS } from "../settings/letterCase.js";
import { LETTER_Q_MODE_OPTIONS } from "../settings/letterQ.js";
import {
  SWAP_BUTTON_MODE_OPTIONS,
  DISPLAY_LAYOUT_MODE_OPTIONS,
  gameSettings,
  setAllowSpellingAbbreviations,
  setAnimationSpeedTier,
  setDisplayLayoutMode,
  setHapticsEnabled,
  setLetterCase,
  setLetterQMode,
  setMarkButtonEnabled,
  setMarkOnSwap,
  setMaterialAnimationEnabled,
  setWordDefinitionMode,
  stepSwapButtonMode,
  WORD_DEFINITION_MODE_OPTIONS,
  setHighRiskSpellConfirm,
  getHighRiskSpellConfirmEnabled,
  CONFIRM_BUTTON_SIDE_OPTIONS,
  getConfirmButtonSide,
  setConfirmButtonSide,
  getDevSuppressAchievementsAndLeaderboards,
  setDevSuppressAchievementsAndLeaderboards,
  WORD_HINT_MODE_OPTIONS,
  setWordHintMode,
} from "../settings/gameSettings.js";
import { isHapticsAvailable, previewHaptic, scheduleOverlayDismiss, scheduleOverlayPresent, triggerHaptic } from "../platform/haptics.js";
import SegmentTabControl from "./SegmentTabControl.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);

/** @type {import('vue').Ref<boolean> | null} */
const developerModeEnabled = inject("developerModeEnabled", null);
/** @type {(() => void) | null} */
const openMaterialBench = inject("openMaterialBench", null);
const showDeveloperTab = computed(() => developerModeEnabled?.value === true);
/** Web 端才展示「显示模式」（有边框 / 无边框） */
const showDisplayLayoutModeSetting = !Capacitor.isNativePlatform();

const stackZ = ref(0);
const settingsTabsRef = ref(/** @type {import('vue').ComponentPublicInstance | null} */ (null));
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

watch(
  () => props.open,
  (v, prev) => {
    if (v) {
      nextTick(() => {
        stackZ.value = settingsOverlayZ();
        settingsTabsRef.value?.reposition?.({ instant: true });
      });
      scheduleOverlayPresent(280);
    } else if (prev) {
      scheduleOverlayDismiss(240);
    }
  },
  { immediate: true },
);

const titleId = "settings-layer-title";

const SETTINGS_BASE_TAB_IDS = Object.freeze(["ui", "gameplay", "controls"]);
const SETTINGS_DEVELOPER_TAB_ID = "developer";

/** @typedef {'ui' | 'gameplay' | 'controls' | 'developer'} SettingsTabId */

/** @type {import('vue').Ref<SettingsTabId>} */
const activeTab = ref("ui");

const settingsTabIds = computed(() =>
  showDeveloperTab.value
    ? [...SETTINGS_BASE_TAB_IDS, SETTINGS_DEVELOPER_TAB_ID]
    : [...SETTINGS_BASE_TAB_IDS],
);

const SETTINGS_TAB_LABELS = Object.freeze({
  ui: "界面",
  gameplay: "游戏性",
  controls: "操作",
  developer: "开发者",
});

const settingsTabOptions = computed(() =>
  settingsTabIds.value.map((id) => ({
    id,
    label: SETTINGS_TAB_LABELS[id] ?? id,
  })),
);

/** @param {SettingsTabId} id */
function setActiveTab(id) {
  if (activeTab.value === id) return;
  triggerHaptic("tabSwitch");
  activeTab.value = id;
}

watch(showDeveloperTab, (visible) => {
  if (!visible && activeTab.value === SETTINGS_DEVELOPER_TAB_ID) {
    activeTab.value = "ui";
  }
  if (visible) {
    nextTick(() => settingsTabsRef.value?.reposition?.({ instant: true }));
  }
});

function onOpenMaterialBench() {
  settingsChangeTap();
  emit("close");
  openMaterialBench?.();
}

const allowAbbrev = computed(() => gameSettings.allowSpellingAbbreviations === true);
const wordDefinitionMode = computed(() => gameSettings.wordDefinitionMode);
const markButtonEnabled = computed(() => gameSettings.markButtonEnabled === true);
const wordHintMode = computed(() => gameSettings.wordHintMode);
const markOnSwap = computed(() => gameSettings.markOnSwap === true);
const markOnSwapSettingEnabled = computed(
  () => markButtonEnabled.value && gameSettings.swapButtonMode !== "hidden",
);
const displayLayoutMode = computed(() => gameSettings.displayLayoutMode);
const animationSpeedTier = computed(() => gameSettings.animationSpeedTier);
const materialAnimationEnabled = computed(() => gameSettings.materialAnimationEnabled !== false);
const materialAnimationSettingSupported = computed(() => isMaterialAnimationSettingSupported());
const materialAnimationToggleChecked = computed(
  () => materialAnimationSettingSupported.value && materialAnimationEnabled.value,
);
const letterCase = computed(() => gameSettings.letterCase);
const letterQMode = computed(() => gameSettings.letterQMode);
const hapticsAvailable = isHapticsAvailable();
const hapticsEnabled = computed(() => gameSettings.hapticsEnabled !== false);
const highRiskSpellConfirmEnabled = computed(() => getHighRiskSpellConfirmEnabled());
const confirmButtonSide = computed(() => getConfirmButtonSide());
const devSuppressAchievementsEnabled = computed(() => getDevSuppressAchievementsAndLeaderboards());

function onToggleHaptics() {
  const next = !hapticsEnabled.value;
  setHapticsEnabled(next);
  if (next) previewHaptic("tap");
}

/** 设置项变更：分段控件自带 tabSwitch，此处供开关/滑条等（仅原生端） */
function settingsChangeTap() {
  if (!hapticsAvailable) return;
  triggerHaptic("tap");
}

/** @param {string} mode */
function onDisplayLayoutModeChange(mode) {
  setDisplayLayoutMode(/** @type {import('../settings/gameSettings.js').DisplayLayoutMode} */ (mode));
}

/** @param {string} tier */
function onAnimationSpeedChange(tier) {
  setAnimationSpeedTier(/** @type {import('../settings/gameSettings.js').AnimationSpeedTier} */ (tier));
}

function onToggleMaterialAnimation() {
  if (!materialAnimationSettingSupported.value) return;
  setMaterialAnimationEnabled(!materialAnimationEnabled.value);
  settingsChangeTap();
}

/** @param {string} caseMode */
function onLetterCaseChange(caseMode) {
  setLetterCase(/** @type {import('../settings/gameSettings.js').LetterCase} */ (caseMode));
}

/** @param {string} mode */
function onLetterQModeChange(mode) {
  setLetterQMode(/** @type {import('../settings/gameSettings.js').LetterQMode} */ (mode));
  settingsChangeTap();
}

const swapModeSizerLabel = SWAP_BUTTON_MODE_OPTIONS.reduce((a, b) =>
  a.label.length >= b.label.length ? a : b,
).label;

const swapModeLabel = computed(() => {
  const id = gameSettings.swapButtonMode;
  return SWAP_BUTTON_MODE_OPTIONS.find((o) => o.id === id)?.label ?? "不显示";
});

function onSwapModePrev() {
  if (!markButtonEnabled.value) return;
  stepSwapButtonMode(-1);
  if (hapticsAvailable) triggerHaptic("tabSwitch");
}

function onSwapModeNext() {
  if (!markButtonEnabled.value) return;
  stepSwapButtonMode(1);
  if (hapticsAvailable) triggerHaptic("tabSwitch");
}

/** @param {string} mode */
function onWordHintModeChange(mode) {
  setWordHintMode(/** @type {import('../settings/wordHintMode.js').WordHintMode} */ (mode));
  settingsChangeTap();
}

function onToggleMarkButton() {
  setMarkButtonEnabled(!markButtonEnabled.value);
  settingsChangeTap();
}

function onToggleMarkOnSwap() {
  if (!markOnSwapSettingEnabled.value) return;
  setMarkOnSwap(!markOnSwap.value);
  settingsChangeTap();
}

function onToggleHighRiskSpellConfirm() {
  setHighRiskSpellConfirm(!highRiskSpellConfirmEnabled.value);
  settingsChangeTap();
}

/** @param {string} side */
function onConfirmButtonSideChange(side) {
  setConfirmButtonSide(/** @type {import('../settings/gameSettings.js').ConfirmButtonSide} */ (side));
}

function onToggleDevSuppressAchievements() {
  setDevSuppressAchievementsAndLeaderboards(!devSuppressAchievementsEnabled.value);
  settingsChangeTap();
}

function onToggleAbbrev() {
  setAllowSpellingAbbreviations(!allowAbbrev.value);
  settingsChangeTap();
}

/** @param {string} mode */
function onWordDefinitionModeChange(mode) {
  setWordDefinitionMode(/** @type {import('../settings/gameSettings.js').WordDefinitionMode} */ (mode));
  settingsChangeTap();
}
</script>

<style scoped>
.settings-layer-backdrop {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  box-sizing: border-box;
}

.settings-layer-scrim {
  /* 与主菜单 / 选项内设置钮 #d4954a 一致 */
  background: rgba(212, 149, 74, 0.88);
  pointer-events: none;
}

.settings-layer-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: min(var(--menu-actions-width), calc(100% - 40 * var(--rpx)));
  height: min(calc(820 * var(--rpx)), calc(100% - 40 * var(--rpx)));
  overflow: hidden;
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx)) calc(24 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.settings-layer-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.settings-layer-tabs-host :deep(.segment-tab--settings-layer) {
  --segment-pad: calc(5 * var(--rpx));
  --segment-btn-pad-y: calc(12 * var(--rpx));
  --segment-btn-pad-x: calc(12 * var(--rpx));
  --segment-font-size: calc(26 * var(--rpx));
  min-height: calc(52 * var(--rpx));
}

.settings-layer-tabs-host :deep(.segment-tab--settings-layer .segment-tab-btn) {
  line-height: 1.2;
}

.settings-layer-title {
  margin: 0 0 calc(22 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.settings-layer-tabs-host {
  margin: calc(-6 * var(--rpx)) 0 calc(18 * var(--rpx));
  width: 100%;
  max-width: none;
  overflow: visible;
  z-index: 2;
}

.settings-layer-panels {
  display: grid;
  /* 操作 tab 最多 5 项 × 80 + 4 间距 × 10，避免切 tab 时内容区高度抖动 */
  min-height: calc(440 * var(--rpx));
}

.settings-layer-panel {
  grid-area: 1 / 1;
  visibility: hidden;
  pointer-events: none;
}

.settings-layer-panel--active {
  visibility: visible;
  pointer-events: auto;
}

.settings-layer-list {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
}

.settings-row--dev-bench {
  align-items: center;
  gap: calc(12 * var(--rpx));
  height: calc(96 * var(--rpx));
  min-height: calc(96 * var(--rpx));
}

.settings-dev-copy {
  flex: 1;
  min-width: 0;
}

.settings-dev-hint {
  margin: calc(4 * var(--rpx)) 0 0;
  font-size: calc(22 * var(--rpx));
  line-height: 1.45;
  color: rgba(60, 58, 50, 0.62);
}

.settings-dev-open-btn {
  flex-shrink: 0;
  border: none;
  border-radius: calc(10 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(18 * var(--rpx));
  font-family: inherit;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  color: #f9f6f2;
  background: #7a6a9e;
  box-shadow: var(--shadow);
}

.settings-layer-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  margin-top: calc(16 * var(--rpx));
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(16 * var(--rpx));
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx));
  background: var(--card, #eee4da);
  border-radius: var(--radius);
  cursor: pointer;
  box-sizing: border-box;
}

.settings-row:not(.settings-row--scale):not(.settings-row--dev-bench) {
  height: calc(80 * var(--rpx));
  min-height: calc(80 * var(--rpx));
}

.settings-row-label {
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
}

.settings-row-label-group {
  display: inline-flex;
  align-items: center;
  min-width: 0;
}

.settings-row-hint {
  margin-left: calc(8 * var(--rpx));
  font-size: calc(22 * var(--rpx));
  font-weight: 500;
  color: var(--text-muted, #7a7468);
}

.settings-row-label-btn-chip {
  flex-shrink: 0;
  margin-left: calc(8 * var(--rpx));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(36 * var(--rpx));
  height: calc(36 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  color: #fff;
}

.settings-row-label-btn-chip i {
  font-size: calc(22 * var(--rpx));
  line-height: 1;
  color: #fff;
}

/* 与局内 word-definition-btn / action-aux-btn / hint-action-bookmark 同色 */
.settings-row-label-btn-chip--definition {
  background: #9b59b6;
}

.settings-row-label-btn-chip--hint {
  background: #f0a928;
}

.settings-row-label-btn-chip--mark {
  background: #5b9bd5;
}

.settings-row-label-btn-chip--swap {
  background: #9b59b6;
}

.settings-row--disabled {
  opacity: 0.45;
  cursor: default;
}

.settings-row--disabled .settings-cycle-arrow:disabled,
.settings-row--disabled .settings-toggle:disabled {
  cursor: not-allowed;
}

.settings-toggle {
  flex-shrink: 0;
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.settings-toggle-track {
  display: block;
  position: relative;
  width: calc(56 * var(--rpx));
  height: calc(32 * var(--rpx));
  border-radius: calc(16 * var(--rpx));
  background: rgba(0, 0, 0, 0.14);
  transition: background 0.16s ease;
}

.settings-toggle-track--on {
  background: #5a8fb8;
}

.settings-toggle-thumb {
  position: absolute;
  top: calc(4 * var(--rpx));
  left: calc(4 * var(--rpx));
  width: calc(24 * var(--rpx));
  height: calc(24 * var(--rpx));
  border-radius: 50%;
  background: #f9f6f2;
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.18);
  transition: transform 0.16s ease;
}

.settings-toggle-track--on .settings-toggle-thumb {
  transform: translateX(calc(24 * var(--rpx)));
}

.settings-row--segment {
  cursor: default;
}

.settings-row--segment :deep(.segment-tab) {
  overflow: hidden;
}

.settings-row--segment .settings-row-label {
  flex-shrink: 0;
}

.settings-row--cycle {
  cursor: default;
}

.settings-cycle {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: calc(8 * var(--rpx));
  padding: 0 calc(4 * var(--rpx));
  background: transparent;
  border: none;
  box-sizing: border-box;
}

.settings-cycle-arrow {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(36 * var(--rpx));
  height: calc(36 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: calc(8 * var(--rpx));
  background: transparent;
  color: var(--text-dark, #3c3a32);
  font-size: calc(24 * var(--rpx));
  line-height: 1;
  cursor: pointer;
  box-shadow: none;
  transition: background 0.14s ease;
}

.settings-cycle-arrow:hover {
  background: rgba(0, 0, 0, 0.08);
}

.settings-cycle-arrow:active {
  background: rgba(0, 0, 0, 0.12);
}

.settings-cycle-arrow:focus-visible {
  outline: calc(2 * var(--rpx)) solid #5a8fb8;
  outline-offset: calc(1 * var(--rpx));
}

.settings-cycle-value {
  position: relative;
  flex: 0 0 auto;
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  line-height: calc(36 * var(--rpx));
  color: var(--text-dark, #3c3a32);
}

.settings-cycle-value-sizer {
  visibility: hidden;
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
}

.settings-cycle-value-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}

.settings-row--scale {
  cursor: default;
  height: calc(92 * var(--rpx));
  min-height: calc(92 * var(--rpx));
}

.settings-row--scale .settings-row-label {
  flex-shrink: 0;
}

.settings-scale-controls {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: calc(10 * var(--rpx));
  min-width: 0;
}

.settings-scale-slider {
  flex: 1 1 auto;
  min-width: 0;
  height: calc(32 * var(--rpx));
  margin: 0;
  padding: 0;
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.settings-scale-slider:focus-visible {
  outline: calc(2 * var(--rpx)) solid #5a8fb8;
  outline-offset: calc(2 * var(--rpx));
  border-radius: calc(4 * var(--rpx));
}

.settings-scale-slider::-webkit-slider-runnable-track {
  height: calc(10 * var(--rpx));
  border-radius: calc(5 * var(--rpx));
  background: linear-gradient(
    to right,
    #5a8fb8 0%,
    #5a8fb8 var(--scale-pct, 50%),
    rgba(0, 0, 0, 0.12) var(--scale-pct, 50%),
    rgba(0, 0, 0, 0.12) 100%
  );
}

.settings-scale-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: calc(26 * var(--rpx));
  height: calc(26 * var(--rpx));
  margin-top: calc(-8 * var(--rpx));
  border: none;
  border-radius: 50%;
  background: #f9f6f2;
  box-shadow: 0 calc(1 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.2);
}

.settings-scale-slider::-moz-range-track {
  height: calc(10 * var(--rpx));
  border-radius: calc(5 * var(--rpx));
  background: rgba(0, 0, 0, 0.12);
}

.settings-scale-slider::-moz-range-progress {
  height: calc(10 * var(--rpx));
  border-radius: calc(5 * var(--rpx));
  background: #5a8fb8;
}

.settings-scale-slider::-moz-range-thumb {
  width: calc(26 * var(--rpx));
  height: calc(26 * var(--rpx));
  border: none;
  border-radius: 50%;
  background: #f9f6f2;
  box-shadow: 0 calc(1 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.2);
}

.settings-scale-input-wrap {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: calc(2 * var(--rpx));
}

.settings-scale-input {
  width: calc(52 * var(--rpx));
  padding: calc(6 * var(--rpx)) calc(4 * var(--rpx));
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
  border-radius: calc(6 * var(--rpx));
  background: var(--card-bright, #f9f6f2);
  font-family: inherit;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  text-align: center;
  -moz-appearance: textfield;
}

.settings-scale-input::-webkit-outer-spin-button,
.settings-scale-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.settings-scale-input:focus {
  outline: none;
  border-color: #5a8fb8;
}

.settings-scale-suffix {
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  color: var(--text-soft, #8f7a66);
  line-height: 1;
}

.settings-back-btn {
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  color: var(--text-dark, #3c3a32);
  background: var(--card, #eee4da);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
}

.settings-back-btn:hover {
  filter: brightness(1.05);
}

.settings-back-btn:active {
  filter: brightness(0.92);
}

.settings-layer-enter-active,
.settings-layer-leave-active {
  transition: opacity calc(0.28s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
}

.settings-layer-enter-active .settings-layer-card,
.settings-layer-leave-active .settings-layer-card {
  transition:
    opacity calc(0.32s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out),
    transform calc(0.32s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
}

.settings-layer-enter-from,
.settings-layer-leave-to {
  opacity: 0;
}

.settings-layer-enter-from .settings-layer-card,
.settings-layer-leave-to .settings-layer-card {
  opacity: 0;
  transform: scale(0.94) translateY(calc(12 * var(--rpx)));
}
</style>
