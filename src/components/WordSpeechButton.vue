<template>
  <button
    type="button"
    class="word-speech-btn"
    :class="{ 'word-speech-btn--speaking': speaking }"
    :aria-label="ariaLabel"
    :disabled="!available"
    @click="onClick"
  >
    <i
      class="word-speech-btn__icon"
      :class="speaking ? 'ri-volume-up-fill' : 'ri-volume-up-line'"
      aria-hidden="true"
    />
  </button>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { isHapticsAvailable, triggerHaptic } from "../platform/haptics.js";
import { isWordSpeechAvailable, speakWord, stopWordSpeech } from "../platform/wordSpeech.js";

const props = defineProps({
  word: { type: String, default: "" },
});

const speaking = ref(false);
const available = computed(() => isWordSpeechAvailable());

const ariaLabel = computed(() => {
  const w = String(props.word ?? "").trim();
  return w ? `朗读 ${w}` : "朗读单词";
});

/** @type {ReturnType<typeof setTimeout> | null} */
let speakingResetTimer = null;

function clearSpeakingResetTimer() {
  if (speakingResetTimer != null) {
    clearTimeout(speakingResetTimer);
    speakingResetTimer = null;
  }
}

function markSpeaking(durationMs = 2400) {
  speaking.value = true;
  clearSpeakingResetTimer();
  speakingResetTimer = setTimeout(() => {
    speaking.value = false;
    speakingResetTimer = null;
  }, durationMs);
}

async function onClick(event) {
  event.stopPropagation();
  if (!available.value) return;
  const w = String(props.word ?? "").trim();
  if (!w) return;

  if (isHapticsAvailable()) triggerHaptic("tap");
  stopWordSpeech();
  markSpeaking(Math.max(1800, w.length * 180));
  await speakWord(w);
}

watch(
  () => props.word,
  () => {
    stopWordSpeech();
    speaking.value = false;
    clearSpeakingResetTimer();
  },
);

onUnmounted(() => {
  stopWordSpeech();
  clearSpeakingResetTimer();
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
  transition: color 0.14s ease, background 0.14s ease, filter 0.12s ease;
}

.word-speech-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
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

.word-speech-btn:not(:disabled):hover::after {
  background: var(--overlay-hover-bright);
}

.word-speech-btn:not(:disabled):active::after {
  background: var(--overlay-active-dim);
}

.word-speech-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid #9b59b6;
  outline-offset: calc(2 * var(--rpx));
}
</style>
