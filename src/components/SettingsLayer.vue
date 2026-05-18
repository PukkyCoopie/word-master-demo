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
import { computed } from "vue";
import { gameSettings, setAllowSpellingAbbreviations } from "../settings/gameSettings.js";

defineProps({
  open: { type: Boolean, default: false },
});

defineEmits(["close"]);

const titleId = "settings-layer-title";

const allowAbbrev = computed(() => gameSettings.allowSpellingAbbreviations === true);

function onToggleAbbrev() {
  setAllowSpellingAbbreviations(!allowAbbrev.value);
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
