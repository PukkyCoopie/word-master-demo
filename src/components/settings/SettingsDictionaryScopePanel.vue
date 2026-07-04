<template>
  <div class="settings-vocabulary-block">
    <div class="settings-row settings-row--segment">
      <span class="settings-row-label-group">
        <span class="settings-row-label">词汇范围</span>
        <SettingsHelpButton
          v-if="scopeMode === 'custom'"
          help-id="dictionaryScope"
          aria-label="词汇范围说明"
        />
      </span>
      <SettingsSegmentControl
        :model-value="scopeMode"
        :options="SCOPE_MODE_OPTIONS"
        :disabled="disabled"
        aria-label="词汇范围模式"
        @update:model-value="onModeChange"
      />
    </div>

    <div
      v-if="scopeMode === 'custom'"
      class="settings-vocabulary-panel"
      role="group"
      aria-label="自定义词汇范围"
    >
      <div class="settings-vocabulary-options">
        <label
          v-for="option in scopeOptions"
          :key="option.id"
          class="settings-vocabulary-option"
          :class="{ 'settings-vocabulary-option--checked': isChecked(option.id) }"
          role="checkbox"
          :aria-checked="isChecked(option.id)"
          :aria-label="option.label"
          @click.prevent="onToggle(option.id)"
        >
          <span
            class="settings-vocabulary-checkbox"
            :class="{ 'settings-vocabulary-checkbox--checked': isChecked(option.id) }"
            aria-hidden="true"
          >
            <svg
              v-if="isChecked(option.id)"
              class="settings-vocabulary-check-icon"
              viewBox="0 0 12 10"
              aria-hidden="true"
            >
              <path
                d="M1.4 5.1 4.5 8.2 10.6 1.7"
                fill="none"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
          <span class="settings-vocabulary-option-body">
            <span class="settings-vocabulary-option-label">{{ option.label }}</span>
          </span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import SettingsSegmentControl from "../SettingsSegmentControl.vue";
import SettingsHelpButton from "./SettingsHelpButton.vue";
import { scopeIdsIncludeFull } from "../../settings/dictionaryScopeIds.js";

const SCOPE_MODE_OPTIONS = Object.freeze([
  { id: "all", label: "全部" },
  { id: "custom", label: "自定义" },
]);

const props = defineProps({
  /** @type {import('vue').PropType<string[]>} */
  modelValue: {
    type: Array,
    default: () => [],
  },
  /** @type {import('vue').PropType<{ id: string, label: string }[]>} */
  scopeOptions: {
    type: Array,
    default: () => [],
  },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "toggle", "modeChange"]);

const scopeMode = computed(() => (scopeIdsIncludeFull(props.modelValue) ? "all" : "custom"));

/** @param {string} id */
function isChecked(id) {
  return props.modelValue.includes(id);
}

/** @param {string} id */
function onToggle(id) {
  emit("toggle", id);
}

/** @param {string} mode */
function onModeChange(mode) {
  if (mode === scopeMode.value) return;
  emit("modeChange", mode);
}
</script>

<style scoped>
.settings-vocabulary-block {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(16 * var(--rpx));
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx));
  background: var(--card, #eee4da);
  border-radius: var(--radius);
  box-sizing: border-box;
  height: calc(80 * var(--rpx));
  min-height: calc(80 * var(--rpx));
}

.settings-row--segment {
  cursor: default;
}

.settings-row--segment :deep(.segment-tab) {
  overflow: hidden;
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
  flex-shrink: 0;
}

.settings-row--segment .settings-row-label {
  flex-shrink: 0;
}

.settings-vocabulary-panel {
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  padding: calc(12 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card, #eee4da);
}

.settings-vocabulary-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: calc(8 * var(--rpx));
}

.settings-vocabulary-option {
  display: flex;
  align-items: center;
  gap: calc(6 * var(--rpx));
  min-height: calc(48 * var(--rpx));
  padding: calc(8 * var(--rpx)) calc(8 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: rgba(255, 255, 255, 0.42);
  border: calc(2 * var(--rpx)) solid transparent;
  cursor: pointer;
  user-select: none;
  box-sizing: border-box;
}

.settings-vocabulary-option--checked {
  border-color: rgba(90, 143, 184, 0.72);
  background: rgba(255, 255, 255, 0.72);
}

.settings-vocabulary-checkbox {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(22 * var(--rpx));
  height: calc(22 * var(--rpx));
  border-radius: calc(4 * var(--rpx));
  border: calc(2 * var(--rpx)) solid rgba(90, 143, 184, 0.55);
  background: rgba(255, 255, 255, 0.55);
  box-sizing: border-box;
  color: #fff;
}

.settings-vocabulary-checkbox--checked {
  border-color: #5a8fb8;
  background: #5a8fb8;
}

.settings-vocabulary-check-icon {
  display: block;
  width: calc(14 * var(--rpx));
  height: calc(12 * var(--rpx));
}

.settings-vocabulary-option-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.settings-vocabulary-option-label {
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  line-height: 1.2;
}
</style>
