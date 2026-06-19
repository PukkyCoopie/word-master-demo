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
            <h2 :id="titleId" class="word-definition-layer-word">{{ displayWord }}</h2>
            <div ref="helpWrapRef" class="word-definition-layer-help-wrap">
              <button
                type="button"
                class="word-definition-layer-help-btn"
                :class="{ 'word-definition-layer-help-btn--active': helpOpen }"
                aria-label="释义说明"
                :aria-expanded="helpOpen"
                @click="toggleHelpPopover"
              >
                <i class="ri-question-line" aria-hidden="true" />
              </button>
              <Transition name="word-definition-layer-help">
                <div
                  v-if="helpOpen"
                  class="word-definition-layer-help-popover"
                  role="note"
                >
                  <p class="word-definition-layer-help-text">
                    释义来自网络词库，并非100%准确。如有错漏请点击这里反馈：
                    <button
                      type="button"
                      class="word-definition-layer-feedback-btn"
                      aria-label="前往论坛反馈"
                      @click="onFeedbackClick"
                    >
                      <i class="ri-edit-line" aria-hidden="true" />
                    </button>
                  </p>
                </div>
              </Transition>
            </div>
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
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { createBackdropSelfCloseGuard } from "../game/backdropSelfCloseGuard.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent } from "../platform/haptics.js";
import { openTapTapFeedbackForum } from "../taptap/tapTapEngagement.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  word: { type: String, default: "" },
  lines: { type: Array, default: () => [] },
});

const emit = defineEmits(["close"]);

const titleId = "word-definition-layer-title";
const stackZ = ref(0);
const helpOpen = ref(false);
const helpWrapRef = ref(null);
const backdropSelfCloseGuard = createBackdropSelfCloseGuard();

/** @param {PointerEvent} e */
function onDocumentPointerDown(e) {
  if (!helpOpen.value) return;
  const wrap = helpWrapRef.value;
  if (wrap instanceof HTMLElement && !wrap.contains(/** @type {Node} */ (e.target))) {
    helpOpen.value = false;
  }
}

watch(helpOpen, (open) => {
  if (open) {
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
  } else {
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  }
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
});

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
      if (wasOpen) {
        scheduleOverlayDismiss(240);
      }
    }
  },
  { immediate: true },
);

function toggleHelpPopover() {
  helpOpen.value = !helpOpen.value;
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

.word-definition-layer-word {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-size: calc(44 * var(--rpx));
  font-weight: 800;
  letter-spacing: calc(0.04 * 1em);
  color: var(--text-dark);
  line-height: 1.2;
  word-break: break-word;
}

.word-definition-layer-help-wrap {
  flex-shrink: 0;
}

.word-definition-layer-help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(40 * var(--rpx));
  height: calc(40 * var(--rpx));
  padding: 0;
  border: calc(1 * var(--rpx)) solid rgba(155, 89, 182, 0.28);
  border-radius: 50%;
  background: rgba(155, 89, 182, 0.1);
  color: #9b59b6;
  font-size: calc(24 * var(--rpx));
  cursor: pointer;
  transition:
    background 0.12s ease,
    color 0.12s ease,
    border-color 0.12s ease;
}

.word-definition-layer-help-btn:hover,
.word-definition-layer-help-btn--active {
  background: rgba(155, 89, 182, 0.18);
  border-color: rgba(155, 89, 182, 0.42);
  color: #7c3aad;
}

.word-definition-layer-help-popover {
  position: absolute;
  top: calc(100% + 10 * var(--rpx));
  left: 0;
  right: 0;
  z-index: 2;
  box-sizing: border-box;
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: #fff;
  border: calc(1 * var(--rpx)) solid rgba(155, 89, 182, 0.22);
  box-shadow: 0 calc(4 * var(--rpx)) calc(16 * var(--rpx)) rgba(60, 40, 80, 0.12);
}

.word-definition-layer-help-text {
  margin: 0;
  font-size: calc(26 * var(--rpx));
  line-height: 1.55;
  color: var(--text);
}

.word-definition-layer-feedback-btn {
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

.word-definition-layer-feedback-btn:hover {
  filter: brightness(1.05);
}

.word-definition-layer-feedback-btn:active {
  filter: brightness(0.94);
}

.word-definition-layer-help-enter-active,
.word-definition-layer-help-leave-active {
  transition:
    opacity calc(0.16s / var(--anim-speed-scale, 1)) ease,
    transform calc(0.16s / var(--anim-speed-scale, 1)) ease;
}

.word-definition-layer-help-enter-from,
.word-definition-layer-help-leave-to {
  opacity: 0;
  transform: translateY(calc(-4 * var(--rpx)));
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
