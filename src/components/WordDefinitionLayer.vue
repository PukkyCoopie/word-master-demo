<template>
  <Teleport defer to="#game-view-portal-frame">
    <Transition name="word-definition-layer" :css="true">
      <div
        v-if="open"
        class="word-definition-layer-backdrop portal-overlay-fill"
        :style="backdropStackStyle"
        role="presentation"
        @click="onBackdropClick"
      >
        <div class="word-definition-layer-scrim" aria-hidden="true" />
        <div
          class="word-definition-layer-card"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          @click.stop
        >
          <div class="word-definition-layer-header">
            <div class="word-definition-layer-title-group">
              <h2 :id="titleId" class="word-definition-layer-word">{{ displayWord }}</h2>
              <WordSpeechButton
                v-if="displayWord"
                class="word-definition-layer-speech"
                :word="displayWord"
              />
              <button
                type="button"
                class="word-definition-layer-help-btn"
                :class="{ 'word-definition-layer-help-btn--active': helpOpen }"
                aria-label="释义说明"
                @click.stop="openHelpDialog"
              >
                <i class="ri-question-line" aria-hidden="true" />
              </button>
            </div>
            <WordFavoriteButton
              v-if="showFavoriteButton"
              class="word-definition-layer-favorite"
              :favorited="favorited"
              :word="displayWord"
              @toggle="emit('toggle-favorite')"
            />
          </div>
          <div class="word-definition-layer-divider" aria-hidden="true" />
          <div v-if="lines.length" class="word-definition-layer-lines">
            <p
              v-for="(line, idx) in lines"
              :key="idx"
              class="word-definition-layer-line"
            >
              <span v-if="parsePosPrefix(line).prefix" class="word-definition-layer-pos">{{
                parsePosPrefix(line).prefix
              }}</span>
              <span class="word-definition-layer-meaning">{{ parsePosPrefix(line).body }}</span>
            </p>
          </div>
          <p v-else class="word-definition-layer-empty">暂无释义</p>
          <button type="button" class="word-definition-layer-dismiss shop-btn" @click="emit('close')">
            关闭
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
  <Teleport to="body">
    <SettingsHelpDialog :open="helpOpen" @close="closeHelpDialog">
      <template #body>
        <p class="settings-help-dialog-text word-definition-help-text">
          释义来自于网络词库；发音来自于系统文字转语音（需英文语音包，并打开媒体音量）。均并非100%准确。如有错漏请点击这里反馈：
          <button
            type="button"
            class="word-definition-help-feedback-btn"
            aria-label="前往论坛反馈"
            @click="onFeedbackClick"
          >
            <i class="ri-edit-line" aria-hidden="true" />
          </button>
        </p>
      </template>
    </SettingsHelpDialog>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { createBackdropSelfCloseGuard } from "../game/backdropSelfCloseGuard.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent } from "../platform/haptics.js";
import { stopWordSpeech } from "../platform/wordSpeech.js";
import { openTapTapFeedbackForum } from "../taptap/tapTapEngagement.js";
import SettingsHelpDialog from "./settings/SettingsHelpDialog.vue";
import WordFavoriteButton from "./WordFavoriteButton.vue";
import WordSpeechButton from "./WordSpeechButton.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  word: { type: String, default: "" },
  lines: { type: Array, default: () => [] },
  favorited: { type: Boolean, default: false },
  showFavoriteButton: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "toggle-favorite"]);

const titleId = "word-definition-layer-title";
const stackZ = ref(0);
const helpOpen = ref(false);
const backdropSelfCloseGuard = createBackdropSelfCloseGuard();

const backdropStackStyle = computed(() =>
  stackZ.value > 0 ? { zIndex: stackZ.value } : {},
);

const displayWord = computed(() => String(props.word ?? "").trim());

watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen) {
      stackZ.value = bumpOverlayZ();
      backdropSelfCloseGuard.arm();
      scheduleOverlayPresent(280);
    } else {
      helpOpen.value = false;
      stopWordSpeech();
      if (wasOpen) {
        scheduleOverlayDismiss(240);
      }
    }
  },
  { immediate: true },
);

function openHelpDialog() {
  helpOpen.value = true;
}

function closeHelpDialog() {
  helpOpen.value = false;
}

async function onFeedbackClick() {
  helpOpen.value = false;
  await openTapTapFeedbackForum();
}

function onBackdropClick() {
  if (!backdropSelfCloseGuard.tryConsume()) return;
  emit("close");
}

/**
 * @param {string} line
 */
function parsePosPrefix(line) {
  const text = String(line ?? "").trim();
  const m = text.match(/^((?:n|v|vi|vt|adj|adv|a|prep|conj|pron|num|art|interj|aux|det|abbr)\.\s*)/i);
  if (!m) return { prefix: "", body: text };
  return { prefix: m[1], body: text.slice(m[1].length).trim() };
}
</script>

<style scoped>
.word-definition-layer-backdrop {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
  box-sizing: border-box;
}

.word-definition-layer-scrim {
  position: absolute;
  inset: 0;
  background: rgba(124, 58, 173, 0.84);
}

.word-definition-layer-card {
  position: relative;
  z-index: 1;
  width: min(100%, calc(620 * var(--rpx)));
  max-height: min(78vh, calc(900 * var(--rpx)));
  overflow: auto;
  box-sizing: border-box;
  padding: calc(36 * var(--rpx)) calc(32 * var(--rpx)) calc(28 * var(--rpx));
  background: var(--card-bright);
  border-radius: calc(16 * var(--rpx));
  box-shadow: var(--shadow);
  border: calc(1 * var(--rpx)) solid rgba(155, 89, 182, 0.22);
}

.word-definition-layer-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(12 * var(--rpx));
  margin-bottom: calc(18 * var(--rpx));
}

.word-definition-layer-title-group {
  display: flex;
  align-items: center;
  gap: calc(8 * var(--rpx));
  min-width: 0;
  flex: 1 1 auto;
}

.word-definition-layer-speech {
  flex-shrink: 0;
}

.word-definition-layer-word {
  margin: 0;
  flex: 0 1 auto;
  min-width: 0;
  font-size: calc(44 * var(--rpx));
  font-weight: 800;
  letter-spacing: calc(0.04 * 1em);
  color: var(--text-dark);
  line-height: 1.2;
  word-break: break-word;
}

.word-definition-layer-favorite {
  flex: 0 0 auto;
  margin-left: auto;
}

.word-definition-layer-help-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: calc(4 * var(--rpx));
  border: none;
  border-radius: 0;
  background: transparent;
  color: #d4954a;
  font-size: calc(30 * var(--rpx));
  line-height: 1;
  cursor: pointer;
  transition: color 0.12s ease, opacity 0.12s ease;
}

.word-definition-layer-help-btn:hover,
.word-definition-layer-help-btn--active {
  color: #c0823a;
  opacity: 1;
}

.word-definition-layer-help-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid #d4954a;
  outline-offset: calc(2 * var(--rpx));
  border-radius: calc(4 * var(--rpx));
}

.word-definition-help-text {
  font-weight: 400;
}

.word-definition-help-feedback-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  width: calc(40 * var(--rpx));
  height: calc(40 * var(--rpx));
  margin-left: calc(4 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: calc(6 * var(--rpx));
  background: #5a8fb8;
  color: #f9f6f2;
  font-size: calc(26 * var(--rpx));
  cursor: pointer;
  box-shadow: 0 calc(2 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.1);
  transition: filter 0.12s ease;
}

.word-definition-help-feedback-btn:hover {
  filter: brightness(1.05);
}

.word-definition-help-feedback-btn:active {
  filter: brightness(0.94);
}

.word-definition-layer-divider {
  height: calc(3 * var(--rpx));
  border-radius: calc(2 * var(--rpx));
  background: rgba(155, 89, 182, 0.35);
  margin-bottom: calc(22 * var(--rpx));
}

.word-definition-layer-lines {
  display: flex;
  flex-direction: column;
  gap: calc(14 * var(--rpx));
  margin-bottom: calc(24 * var(--rpx));
}

.word-definition-layer-line {
  margin: 0;
  font-size: calc(26 * var(--rpx));
  line-height: 1.55;
  color: var(--text);
}

.word-definition-layer-pos {
  font-weight: 700;
  color: #9b59b6;
  margin-right: calc(4 * var(--rpx));
}

.word-definition-layer-meaning {
  font-weight: 400;
}

.word-definition-layer-empty {
  margin: 0 0 calc(24 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  color: rgba(74, 66, 56, 0.62);
}

.word-definition-layer-dismiss {
  width: 100%;
  background: #9b59b6;
  color: #fff;
  border: none;
}

.word-definition-layer-enter-active,
.word-definition-layer-leave-active {
  transition: opacity calc(0.24s / var(--anim-speed-scale, 1)) ease;
}

.word-definition-layer-enter-active .word-definition-layer-card,
.word-definition-layer-leave-active .word-definition-layer-card {
  transition:
    transform calc(0.28s / var(--anim-speed-scale, 1)) cubic-bezier(0.22, 1, 0.36, 1),
    opacity calc(0.24s / var(--anim-speed-scale, 1)) ease;
}

.word-definition-layer-enter-from,
.word-definition-layer-leave-to {
  opacity: 0;
}

.word-definition-layer-enter-from .word-definition-layer-card,
.word-definition-layer-leave-to .word-definition-layer-card {
  opacity: 0;
  transform: translateY(calc(16 * var(--rpx))) scale(0.96);
}
</style>
