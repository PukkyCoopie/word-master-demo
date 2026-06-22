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

        <div
          class="settings-layer-tabs"
          role="tablist"
          aria-label="设置分组"
          :style="tabSlideStyle"
        >
          <div class="settings-layer-tabs-thumb" aria-hidden="true" />
          <button
            type="button"
            class="settings-layer-tab"
            role="tab"
            :class="{ 'settings-layer-tab--active': activeTab === 'ui' }"
            :aria-selected="activeTab === 'ui'"
            @click="setActiveTab('ui')"
          >
            界面
          </button>
          <button
            type="button"
            class="settings-layer-tab"
            role="tab"
            :class="{ 'settings-layer-tab--active': activeTab === 'gameplay' }"
            :aria-selected="activeTab === 'gameplay'"
            @click="setActiveTab('gameplay')"
          >
            游戏性
          </button>
          <button
            type="button"
            class="settings-layer-tab"
            role="tab"
            :class="{ 'settings-layer-tab--active': activeTab === 'controls' }"
            :aria-selected="activeTab === 'controls'"
            @click="setActiveTab('controls')"
          >
            操作
          </button>
          <button
            v-if="showDeveloperTab"
            type="button"
            class="settings-layer-tab"
            role="tab"
            :class="{ 'settings-layer-tab--active': activeTab === 'developer' }"
            :aria-selected="activeTab === 'developer'"
            @click="setActiveTab('developer')"
          >
            开发者
          </button>
        </div>

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
                <div class="settings-row settings-row--segment">
                  <span class="settings-row-label">显示模式</span>
                  <SettingsSegmentControl
                    :options="DISPLAY_LAYOUT_MODE_OPTIONS"
                    :model-value="displayLayoutMode"
                    aria-label="显示模式"
                    @update:model-value="onDisplayLayoutModeChange"
                  />
                </div>

                <div class="settings-row settings-row--scale">
                  <span class="settings-row-label">界面缩放</span>
                  <div class="settings-scale-controls">
                    <input
                      type="range"
                      class="settings-scale-slider"
                      :min="UI_SCALE_MIN"
                      :max="UI_SCALE_MAX"
                      step="1"
                      :value="uiScalePercent"
                      :aria-valuemin="UI_SCALE_MIN"
                      :aria-valuemax="UI_SCALE_MAX"
                      :aria-valuenow="uiScalePercent"
                      aria-label="界面缩放百分比"
                      :style="scaleSliderStyle"
                      @input="onScaleSliderInput"
                    />
                    <div class="settings-scale-input-wrap">
                      <input
                        type="text"
                        inputmode="numeric"
                        pattern="[0-9]*"
                        class="settings-scale-input"
                        :value="scaleInputText"
                        aria-label="界面缩放百分比数值"
                        @input="onScaleTextInput"
                        @blur="commitScaleInput"
                        @keydown.enter.prevent="onScaleInputEnter"
                      />
                      <span class="settings-scale-suffix" aria-hidden="true">%</span>
                    </div>
                  </div>
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

                <label class="settings-row">
                  <span class="settings-row-label">减少动画</span>
                  <button
                    type="button"
                    class="settings-toggle"
                    role="switch"
                    :aria-checked="reduceMotionEnabled"
                    @click="onToggleReduceMotion"
                  >
                    <span
                      class="settings-toggle-track"
                      :class="{ 'settings-toggle-track--on': reduceMotionEnabled }"
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
                  <span class="settings-row-label">释义</span>
                  <SettingsSegmentControl
                    :options="WORD_DEFINITION_MODE_OPTIONS"
                    :model-value="wordDefinitionMode"
                    aria-label="释义显示"
                    @update:model-value="onWordDefinitionModeChange"
                  />
                </div>

                <div class="settings-row settings-row--segment">
                  <span class="settings-row-label">字母Q</span>
                  <SettingsSegmentControl
                    :options="LETTER_Q_MODE_OPTIONS"
                    :model-value="letterQMode"
                    aria-label="字母Q"
                    @update:model-value="onLetterQModeChange"
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
                    <SettingsHelpButton
                      aria-label="标记按钮说明"
                      :active="activeHelpId === 'mark'"
                      @click="openHelp('mark')"
                    />
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
                    <SettingsHelpButton
                      aria-label="对调按钮说明"
                      :active="activeHelpId === 'swap'"
                      @click="openHelp('swap')"
                    />
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
                    <SettingsHelpButton
                      aria-label="对调时标记说明"
                      :active="activeHelpId === 'markOnSwap'"
                      @click="openHelp('markOnSwap')"
                    />
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
                    <span class="settings-row-label">高风险确认</span>
                    <SettingsHelpButton
                      aria-label="高风险确认说明"
                      :active="activeHelpId === 'highRisk'"
                      @click="openHelp('highRisk')"
                    />
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

  <SettingsHelpDialog
    :open="activeHelpId != null"
    :title="activeHelpContent.title"
    :paragraphs="activeHelpContent.paragraphs"
    :demo-variant="activeHelpContent.demoVariant"
    @close="closeHelp"
  />
</template>

<script setup>
import { computed, inject, nextTick, ref, watch } from "vue";
import { settingsOverlayZ } from "../game/overlayStack.js";
import SettingsSegmentControl from "./SettingsSegmentControl.vue";
import SettingsHelpButton from "./settings/SettingsHelpButton.vue";
import SettingsHelpDialog from "./settings/SettingsHelpDialog.vue";
import { ANIMATION_SPEED_OPTIONS } from "../settings/animationSpeed.js";
import { LETTER_CASE_OPTIONS } from "../settings/letterCase.js";
import { LETTER_Q_MODE_OPTIONS } from "../settings/letterQ.js";
import {
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  SWAP_BUTTON_MODE_OPTIONS,
  DISPLAY_LAYOUT_MODE_OPTIONS,
  clampUiScalePercent,
  gameSettings,
  setAllowSpellingAbbreviations,
  setAnimationSpeedTier,
  setDisplayLayoutMode,
  setHapticsEnabled,
  setLetterCase,
  setLetterQMode,
  setMarkButtonEnabled,
  setMarkOnSwap,
  setReduceMotion,
  setUiScalePercent,
  setWordDefinitionMode,
  stepSwapButtonMode,
  WORD_DEFINITION_MODE_OPTIONS,
  setHighRiskSpellConfirm,
  getHighRiskSpellConfirmEnabled,
} from "../settings/gameSettings.js";
import { isHapticsAvailable, previewHaptic, scheduleOverlayDismiss, scheduleOverlayPresent, triggerHaptic } from "../platform/haptics.js";

const props = defineProps({
  open: { type: Boolean, default: false },
});

const emit = defineEmits(["close"]);

/** @type {import('vue').Ref<boolean> | null} */
const developerModeEnabled = inject("developerModeEnabled", null);
/** @type {(() => void) | null} */
const openMaterialBench = inject("openMaterialBench", null);
const showDeveloperTab = computed(() => developerModeEnabled?.value === true);

const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

watch(
  () => props.open,
  (v, prev) => {
    if (v) {
      nextTick(() => {
        stackZ.value = settingsOverlayZ();
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

const activeTabIndex = computed(() => {
  const idx = settingsTabIds.value.indexOf(activeTab.value);
  return idx >= 0 ? idx : 0;
});

const tabSlideStyle = computed(() => ({
  "--settings-tab-count": String(settingsTabIds.value.length),
  "--settings-tab-index": String(activeTabIndex.value),
}));

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
});

function onOpenMaterialBench() {
  settingsChangeTap();
  emit("close");
  openMaterialBench?.();
}

const allowAbbrev = computed(() => gameSettings.allowSpellingAbbreviations === true);
const wordDefinitionMode = computed(() => gameSettings.wordDefinitionMode);
const markButtonEnabled = computed(() => gameSettings.markButtonEnabled === true);
const markOnSwap = computed(() => gameSettings.markOnSwap === true);
const markOnSwapSettingEnabled = computed(
  () => markButtonEnabled.value && gameSettings.swapButtonMode !== "hidden",
);
const uiScalePercent = computed(() => gameSettings.uiScalePercent);
const displayLayoutMode = computed(() => gameSettings.displayLayoutMode);
const animationSpeedTier = computed(() => gameSettings.animationSpeedTier);
const letterCase = computed(() => gameSettings.letterCase);
const letterQMode = computed(() => gameSettings.letterQMode);
const reduceMotionEnabled = computed(() => gameSettings.reduceMotion === true);
const hapticsAvailable = isHapticsAvailable();
const hapticsEnabled = computed(() => gameSettings.hapticsEnabled !== false);
const highRiskSpellConfirmEnabled = computed(() => getHighRiskSpellConfirmEnabled());

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

function onToggleReduceMotion() {
  setReduceMotion(!reduceMotionEnabled.value);
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

/** @typedef {'mark' | 'swap' | 'markOnSwap' | 'highRisk'} SettingsHelpId */

/** @type {import('vue').Ref<SettingsHelpId | null>} */
const activeHelpId = ref(null);

/** @type {Record<SettingsHelpId, { title: string; paragraphs: string[]; demoVariant: SettingsHelpId }>} */
const SETTINGS_HELP_COPY = {
  mark: {
    title: "",
    paragraphs: ["通过该按钮为字母块添加角标"],
    demoVariant: "mark",
  },
  swap: {
    title: "",
    paragraphs: ["收回选中的字母，然后选中一些其他字母，方便后续进行丢弃操作"],
    demoVariant: "swap",
  },
  markOnSwap: {
    title: "",
    paragraphs: [
      "将选中的字母送回棋盘时，自动为它们打上标记",
      "被标记的字母可以通过点击标记键快速选中",
    ],
    demoVariant: "markOnSwap",
  },
  highRisk: {
    title: "",
    paragraphs: ["在使用高风险的法术时，启用此项以防止误操作"],
    demoVariant: "",
  },
};

const activeHelpContent = computed(() => {
  const id = activeHelpId.value;
  if (!id) {
    return { title: "", paragraphs: [], demoVariant: "" };
  }
  return SETTINGS_HELP_COPY[id];
});

/** @param {SettingsHelpId} id */
function openHelp(id) {
  activeHelpId.value = id;
}

function closeHelp() {
  activeHelpId.value = null;
}

const scaleSliderStyle = computed(() => {
  const t = (uiScalePercent.value - UI_SCALE_MIN) / (UI_SCALE_MAX - UI_SCALE_MIN);
  return { "--scale-pct": `${Math.round(Math.min(1, Math.max(0, t)) * 100)}%` };
});

/** @type {import('vue').Ref<string>} */
const scaleInputText = ref(String(gameSettings.uiScalePercent));

watch(uiScalePercent, (v) => {
  scaleInputText.value = String(v);
});

function onToggleAbbrev() {
  setAllowSpellingAbbreviations(!allowAbbrev.value);
  settingsChangeTap();
}

/** @param {string} mode */
function onWordDefinitionModeChange(mode) {
  setWordDefinitionMode(/** @type {import('../settings/gameSettings.js').WordDefinitionMode} */ (mode));
  settingsChangeTap();
}

/** @param {Event} e */
function onScaleSliderInput(e) {
  const raw = /** @type {HTMLInputElement} */ (e.target).value;
  setUiScalePercent(Number(raw));
  scaleInputText.value = String(gameSettings.uiScalePercent);
  if (hapticsAvailable) triggerHaptic("land");
}

/** @param {Event} e */
function onScaleTextInput(e) {
  scaleInputText.value = /** @type {HTMLInputElement} */ (e.target).value.replace(/\D/g, "").slice(0, 3);
}

function commitScaleInput() {
  const prev = gameSettings.uiScalePercent;
  const digits = scaleInputText.value.replace(/\D/g, "");
  const next = digits === "" ? prev : clampUiScalePercent(digits);
  setUiScalePercent(next);
  scaleInputText.value = String(gameSettings.uiScalePercent);
  if (gameSettings.uiScalePercent !== prev) settingsChangeTap();
}

/** @param {KeyboardEvent} e */
function onScaleInputEnter(e) {
  /** @type {HTMLInputElement} */ (e.target).blur();
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

.settings-layer-title {
  margin: 0 0 calc(22 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.settings-layer-tabs {
  --settings-tab-pad: calc(4 * var(--rpx));
  --settings-orange: #d4954a;
  --settings-orange-fg: #f9f6f2;
  position: relative;
  display: flex;
  gap: 0;
  margin: calc(-6 * var(--rpx)) 0 calc(18 * var(--rpx));
  padding: var(--settings-tab-pad);
  border-radius: calc(8 * var(--rpx));
  background: rgba(0, 0, 0, 0.08);
  box-sizing: border-box;
}

.settings-layer-tabs-thumb {
  position: absolute;
  top: var(--settings-tab-pad);
  bottom: var(--settings-tab-pad);
  left: var(--settings-tab-pad);
  width: calc((100% - 2 * var(--settings-tab-pad)) / var(--settings-tab-count));
  border-radius: calc(6 * var(--rpx));
  background: var(--settings-orange);
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.14);
  pointer-events: none;
  transition: transform calc(0.22s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
  transform: translateX(calc(var(--settings-tab-index) * 100%));
  z-index: 0;
}

.settings-layer-tab {
  flex: 1;
  min-width: 0;
  position: relative;
  z-index: 1;
  border: none;
  border-radius: calc(6 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(12 * var(--rpx));
  font-family: inherit;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  background: transparent;
  cursor: pointer;
  opacity: 0.72;
  transition:
    color 0.12s ease,
    opacity 0.12s ease;
}

.settings-layer-tab--active {
  color: var(--settings-orange-fg);
  opacity: 1;
}

.settings-layer-tab:hover:not(.settings-layer-tab--active) {
  opacity: 0.88;
}

.settings-layer-tab:focus-visible {
  outline: calc(2 * var(--rpx)) solid var(--settings-orange);
  outline-offset: calc(1 * var(--rpx));
}

.settings-layer-panels {
  display: grid;
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

:global(html.reduce-motion) .settings-layer-tabs-thumb {
  transition: none;
}
</style>
