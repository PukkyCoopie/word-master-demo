<template>
  <button
    type="button"
    class="word-speech-btn"
    :class="{
      'word-speech-btn--speaking': speaking,
      'word-speech-btn--unavailable': !available,
    }"
    :aria-label="ariaLabel"
    :aria-disabled="!available ? 'true' : undefined"
    @click="onClick"
  >
    <i
      class="word-speech-btn__icon"
      :class="speaking ? 'ri-volume-up-fill' : 'ri-volume-up-line'"
      aria-hidden="true"
    />
  </button>
  <Teleport defer to="#game-view-portal-frame">
    <div v-if="toastMessage" class="word-speech-toast" role="status" aria-live="polite">
      {{ toastMessage }}
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { isHapticsAvailable, triggerHaptic } from "../platform/haptics.js";
import {
  getWordSpeechUnavailableHint,
  isWordSpeechAvailable,
  probeWordSpeechAvailability,
  speakWord,
  stopWordSpeech,
} from "../platform/wordSpeech.js";

const props = defineProps({
  word: { type: String, default: "" },
});

const speaking = ref(false);
const available = ref(isWordSpeechAvailable());
const toastMessage = ref("");

const ariaLabel = computed(() => {
  const w = String(props.word ?? "").trim();
  if (!available.value) return "发音不可用";
  return w ? `朗读 ${w}` : "朗读单词";
});

/** @type {ReturnType<typeof setTimeout> | null} */
let speakingResetTimer = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let toastClearTimer = null;
let speakGeneration = 0;
let mounted = true;

function clearSpeakingResetTimer() {
  if (speakingResetTimer != null) {
    clearTimeout(speakingResetTimer);
    speakingResetTimer = null;
  }
}

function clearToastTimer() {
  if (toastClearTimer != null) {
    clearTimeout(toastClearTimer);
    toastClearTimer = null;
  }
}

/**
 * @param {string} msg
 * @param {number} [ms]
 */
function showToast(msg, ms = 2600) {
  const text = String(msg ?? "").trim();
  if (!text) return;
  clearToastTimer();
  toastMessage.value = text;
  toastClearTimer = setTimeout(() => {
    toastMessage.value = "";
    toastClearTimer = null;
  }, ms);
}

/**
 * @param {number} [durationMs]
 */
function markSpeaking(durationMs = 2400) {
  speaking.value = true;
  clearSpeakingResetTimer();
  speakingResetTimer = setTimeout(() => {
    speaking.value = false;
    speakingResetTimer = null;
  }, durationMs);
}

async function refreshAvailability() {
  const ok = await probeWordSpeechAvailability();
  available.value = ok;
}

async function onClick(event) {
  event.stopPropagation();
  const w = String(props.word ?? "").trim();
  if (!w) return;

  if (!available.value) {
    // 再探一次：初始化中/语音包刚装好时可能已恢复
    await refreshAvailability();
    if (!available.value) {
      showToast(getWordSpeechUnavailableHint());
      return;
    }
  }

  if (isHapticsAvailable()) triggerHaptic("tap");

  const gen = ++speakGeneration;
  const result = await speakWord(w);
  if (!mounted || gen !== speakGeneration) return;

  if (result?.ok) {
    available.value = true;
    markSpeaking(Math.max(1800, w.length * 180));
    return;
  }

  speaking.value = false;
  clearSpeakingResetTimer();
  if (result?.cancelled) return;

  available.value = false;
  showToast(result?.message || getWordSpeechUnavailableHint());
}

watch(
  () => props.word,
  () => {
    speakGeneration += 1;
    stopWordSpeech();
    speaking.value = false;
    clearSpeakingResetTimer();
  },
);

onMounted(() => {
  mounted = true;
  refreshAvailability();
});

onUnmounted(() => {
  mounted = false;
  speakGeneration += 1;
  stopWordSpeech();
  clearSpeakingResetTimer();
  clearToastTimer();
});

defineExpose({ stop: stopWordSpeech });
</script>

<style scoped>
.word-speech-btn {
  flex: 0 0 auto;
  position: relative;
  width: calc(48 * var(--rpx));
  height: calc(48 * var(--rpx));
  padding: 0;
  border: none;
  border-radius: var(--radius);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #f0e6f6;
  color: #9b59b6;
  cursor: pointer;
  box-shadow: var(--shadow);
  overflow: hidden;
  font: inherit;
  transition: color 0.14s ease, background 0.14s ease, filter 0.12s ease, opacity 0.12s ease;
}

.word-speech-btn--unavailable {
  opacity: 0.42;
}

.word-speech-btn__icon {
  font-size: calc(26 * var(--rpx));
  line-height: 1;
  transform: translateY(calc(-1 * var(--rpx)));
}

.word-speech-btn--speaking {
  background: #e4d4ef;
  color: #8e44ad;
}

.word-speech-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: transparent;
  transition: background 0.12s ease;
}

.word-speech-btn:hover::after {
  background: var(--overlay-hover-bright);
}

.word-speech-btn:active::after {
  background: var(--overlay-active-dim);
}

.word-speech-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid #9b59b6;
  outline-offset: calc(2 * var(--rpx));
}

.word-speech-toast {
  position: absolute;
  left: 50%;
  bottom: calc(120 * var(--rpx));
  transform: translateX(-50%);
  z-index: 320;
  max-width: calc(620 * var(--rpx));
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: calc(12 * var(--rpx)) calc(24 * var(--rpx));
  border-radius: var(--radius);
  font-size: calc(22 * var(--rpx));
  line-height: 1.35;
  text-align: center;
  pointer-events: none;
  animation: word-speech-toast-in 0.32s var(--ease-expo-out, ease-out) both;
}

@keyframes word-speech-toast-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(calc(8 * var(--rpx)));
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}
</style>
