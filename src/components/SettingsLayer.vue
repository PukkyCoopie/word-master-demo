<template>
  <Transition name="settings-layer">
    <div
      v-if="open"
      class="settings-layer-backdrop"
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

        <div class="settings-layer-body">
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
import { computed, ref, watch } from "vue";
import {
  UI_SCALE_MAX,
  UI_SCALE_MIN,
  clampUiScalePercent,
  gameSettings,
  setAllowSpellingAbbreviations,
  setUiScalePercent,
} from "../settings/gameSettings.js";

defineProps({
  open: { type: Boolean, default: false },
});

defineEmits(["close"]);

const titleId = "settings-layer-title";

const allowAbbrev = computed(() => gameSettings.allowSpellingAbbreviations === true);
const uiScalePercent = computed(() => gameSettings.uiScalePercent);

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
}

/** @param {Event} e */
function onScaleSliderInput(e) {
  const raw = /** @type {HTMLInputElement} */ (e.target).value;
  setUiScalePercent(Number(raw));
  scaleInputText.value = String(gameSettings.uiScalePercent);
}

/** @param {Event} e */
function onScaleTextInput(e) {
  scaleInputText.value = /** @type {HTMLInputElement} */ (e.target).value.replace(/\D/g, "").slice(0, 3);
}

function commitScaleInput() {
  const digits = scaleInputText.value.replace(/\D/g, "");
  const next = digits === "" ? gameSettings.uiScalePercent : clampUiScalePercent(digits);
  setUiScalePercent(next);
  scaleInputText.value = String(gameSettings.uiScalePercent);
}

/** @param {KeyboardEvent} e */
function onScaleInputEnter(e) {
  /** @type {HTMLInputElement} */ (e.target).blur();
}
</script>

<style scoped>
.settings-layer-backdrop {
  position: absolute;
  inset: 0;
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  box-sizing: border-box;
  border-radius: inherit;
}

.settings-layer-scrim {
  position: absolute;
  inset: 0;
  border-radius: inherit;
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
  width: min(calc(540 * var(--rpx)), calc(100% - 48 * var(--rpx)));
  height: min(calc(700 * var(--rpx)), calc(100% - 48 * var(--rpx)));
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

.settings-layer-list {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
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

.settings-row--scale {
  flex-direction: column;
  align-items: stretch;
  gap: calc(12 * var(--rpx));
  cursor: default;
}

.settings-scale-controls {
  display: flex;
  align-items: center;
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
  transition: opacity 0.28s var(--ease-expo-out, ease-out);
}

.settings-layer-enter-active .settings-layer-card,
.settings-layer-leave-active .settings-layer-card {
  transition:
    opacity 0.32s var(--ease-expo-out, ease-out),
    transform 0.32s var(--ease-expo-out, ease-out);
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
