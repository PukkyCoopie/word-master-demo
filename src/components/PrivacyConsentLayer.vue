<template>
  <Transition name="privacy-consent-layer">
    <div
      v-if="open"
      class="privacy-consent-layer-backdrop"
      :style="backdropStackStyle"
      role="presentation"
    >
      <div class="privacy-consent-layer-scrim" aria-hidden="true" />
      <div
        class="privacy-consent-layer-card"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.stop
      >
        <h2 :id="titleId" class="privacy-consent-layer-title">隐私提示</h2>

        <div class="privacy-consent-scroll-outer">
          <div class="privacy-consent-content-panel">
            <div
              ref="scrollBodyRef"
              class="privacy-consent-layer-body"
              :class="{ 'privacy-consent-layer-body--dragging': thumbDragging }"
              @scroll.passive="onScrollBody"
            >
              <template v-for="(block, blockIdx) in policyBlocks" :key="`block-${blockIdx}`">
                <div v-if="block.kind === 'gap'" class="privacy-consent-gap" aria-hidden="true" />

                <h3 v-else-if="block.kind === 'h'" class="privacy-consent-heading">
                  {{ block.text }}
                </h3>

                <ol
                  v-else-if="block.kind === 'ol'"
                  class="privacy-consent-list privacy-consent-list--ordered"
                  :class="{ 'privacy-consent-list--plain': block.plain }"
                >
                  <li v-for="(item, itemIdx) in block.items" :key="`ol-${blockIdx}-${itemIdx}`">
                    <PrivacyPolicyInlineSegments :segments="item" />
                  </li>
                </ol>

                <ul
                  v-else-if="block.kind === 'ul'"
                  class="privacy-consent-list privacy-consent-list--unordered"
                >
                  <li v-for="(item, itemIdx) in block.items" :key="`ul-${blockIdx}-${itemIdx}`">
                    <PrivacyPolicyInlineSegments :segments="item" />
                  </li>
                </ul>

                <p v-else class="privacy-consent-text">
                  <PrivacyPolicyInlineSegments :segments="block.segments" />
                </p>
              </template>

              <p class="privacy-consent-text privacy-consent-dates">
                更新日期：{{ PRIVACY_POLICY_EFFECTIVE_DATE }}<br />
                生效日期：{{ PRIVACY_POLICY_EFFECTIVE_DATE }}
              </p>
            </div>
          </div>

          <div
            v-show="scrollbarVisible"
            ref="scrollTrackRef"
            class="privacy-consent-scroll-track"
            aria-hidden="true"
            @pointerdown="onTrackPointerDown"
          >
            <div
              class="privacy-consent-scroll-thumb"
              :class="{ 'privacy-consent-scroll-thumb--dragging': thumbDragging }"
              :style="thumbStyle"
              @pointerdown.stop="onThumbPointerDown"
            />
          </div>
        </div>

        <div class="privacy-consent-layer-footer">
          <template v-if="mode === 'consent'">
            <button
              type="button"
              class="privacy-consent-btn privacy-consent-btn--agree"
              @click="emit('agree')"
            >
              同意
            </button>
            <button
              type="button"
              class="privacy-consent-btn privacy-consent-btn--decline"
              @click="emit('decline')"
            >
              不同意
            </button>
          </template>
          <button
            v-else
            type="button"
            class="privacy-consent-btn privacy-consent-btn--decline"
            @click="emit('close')"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent } from "../platform/haptics.js";
import { usePanelScrollbar } from "../composables/usePanelScrollbar.js";
import {
  PRIVACY_POLICY_BODY_BLOCKS,
  PRIVACY_POLICY_CONSENT_BLOCKS,
  PRIVACY_POLICY_EFFECTIVE_DATE,
} from "../privacy/privacyPolicyCopy.js";

const PrivacyPolicyInlineSegments = defineComponent({
  name: "PrivacyPolicyInlineSegments",
  props: {
    segments: { type: Array, required: true },
  },
  setup(props) {
    return () =>
      props.segments.map((segment, idx) => {
        if (segment.type === "link" && segment.href) {
          return h(
            "a",
            {
              key: idx,
              class: "privacy-consent-link",
              href: segment.href,
              target: "_blank",
              rel: "noopener noreferrer",
              onClick: (event) => event.stopPropagation(),
            },
            segment.value,
          );
        }
        if (segment.type === "bold") {
          return h("strong", { key: idx, class: "privacy-consent-emphasis" }, segment.value);
        }
        return h("span", { key: idx }, segment.value);
      });
  },
});

const props = defineProps({
  open: { type: Boolean, default: false },
  /** @type {'consent' | 'view'} */
  mode: { type: String, default: "consent" },
});

const emit = defineEmits(["agree", "decline", "close"]);

const titleId = "privacy-consent-layer-title";
const stackZ = ref(0);

const {
  scrollBodyRef,
  scrollTrackRef,
  scrollbarVisible,
  thumbDragging,
  thumbStyle,
  onScrollBody,
  onThumbPointerDown,
  onTrackPointerDown,
  updateScrollbarMetrics,
  bindResizeObserver,
} = usePanelScrollbar({ thumbColor: "#8a8580" });

const policyBlocks = computed(() =>
  props.mode === "consent"
    ? [...PRIVACY_POLICY_BODY_BLOCKS, ...PRIVACY_POLICY_CONSENT_BLOCKS]
    : PRIVACY_POLICY_BODY_BLOCKS,
);

const backdropStackStyle = computed(() =>
  stackZ.value > 0 ? { zIndex: stackZ.value } : {},
);

watch(
  () => props.open,
  async (isOpen, prev) => {
    if (isOpen) {
      stackZ.value = bumpOverlayZ();
      scheduleOverlayPresent(280);
      await nextTick();
      bindResizeObserver();
      if (scrollBodyRef.value) scrollBodyRef.value.scrollTop = 0;
      updateScrollbarMetrics();
    } else if (prev) {
      scheduleOverlayDismiss(240);
    }
  },
  { immediate: true },
);

watch(
  () => [props.open, props.mode],
  async () => {
    if (!props.open) return;
    await nextTick();
    if (scrollBodyRef.value) scrollBodyRef.value.scrollTop = 0;
    updateScrollbarMetrics();
  },
);
</script>

<style scoped>
.privacy-consent-layer-backdrop {
  z-index: 25;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  box-sizing: border-box;
}

.privacy-consent-layer-scrim {
  background: rgba(60, 58, 50, 0.5);
  pointer-events: none;
}

.privacy-consent-layer-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: min(var(--menu-actions-width), calc(100% - 40 * var(--rpx)));
  height: min(calc(880 * var(--rpx)), calc(100% - 40 * var(--rpx)));
  --privacy-text-size: calc(22 * var(--rpx));
  --privacy-text-lh: 1.45;
  --privacy-panel-bg: #5a534c;
  --privacy-panel-fg: #f5f2ea;
  --privacy-panel-muted: rgba(245, 242, 234, 0.72);
  --privacy-link: #c8dce8;
  overflow: hidden;
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(28 * var(--rpx)) calc(24 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.privacy-consent-layer-title {
  margin: 0 0 calc(22 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.privacy-consent-scroll-outer {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: calc(10 * var(--rpx));
}

.privacy-consent-content-panel {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--privacy-panel-bg);
  border: calc(1 * var(--rpx)) solid rgba(0, 0, 0, 0.14);
  box-shadow: inset 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.05);
}

.privacy-consent-layer-body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
  box-sizing: border-box;
  padding: calc(16 * var(--rpx)) calc(18 * var(--rpx)) calc(18 * var(--rpx));
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.privacy-consent-layer-body--dragging {
  scroll-behavior: auto;
}

.privacy-consent-layer-body::-webkit-scrollbar {
  display: none;
}

.privacy-consent-text {
  margin: 0;
  font-size: var(--privacy-text-size);
  font-weight: 600;
  line-height: var(--privacy-text-lh);
  color: var(--privacy-panel-fg);
}

.privacy-consent-heading {
  margin: calc(14 * var(--rpx)) 0 calc(8 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 800;
  line-height: var(--privacy-text-lh);
  color: var(--privacy-panel-fg);
}

.privacy-consent-heading:first-child {
  margin-top: 0;
}

.privacy-consent-gap {
  height: calc(10 * var(--rpx));
}

.privacy-consent-list {
  margin: calc(8 * var(--rpx)) 0 calc(10 * var(--rpx));
  padding-left: calc(34 * var(--rpx));
  font-size: var(--privacy-text-size);
  font-weight: 600;
  line-height: var(--privacy-text-lh);
  color: var(--privacy-panel-fg);
}

.privacy-consent-list--ordered {
  list-style-type: decimal;
  list-style-position: outside;
}

.privacy-consent-list--plain {
  list-style: none;
  padding-left: 0;
}

.privacy-consent-list--plain li {
  padding-left: 0;
}

.privacy-consent-list--unordered {
  list-style-type: disc;
  list-style-position: outside;
}

.privacy-consent-list li {
  padding-left: calc(4 * var(--rpx));
}

.privacy-consent-list li + li {
  margin-top: calc(8 * var(--rpx));
}

.privacy-consent-dates {
  margin-top: calc(12 * var(--rpx));
  color: var(--privacy-panel-muted);
  font-size: calc(20 * var(--rpx));
}

.privacy-consent-layer-body :deep(.privacy-consent-link) {
  color: var(--privacy-link);
  font-weight: 800;
  text-decoration: underline;
  text-decoration-color: rgba(200, 220, 232, 0.55);
  text-underline-offset: calc(2 * var(--rpx));
}

.privacy-consent-layer-body :deep(.privacy-consent-link:visited),
.privacy-consent-layer-body :deep(.privacy-consent-link:active) {
  color: var(--privacy-link);
}

.privacy-consent-emphasis {
  color: var(--privacy-panel-fg);
  font-weight: 800;
}

.privacy-consent-scroll-track {
  flex-shrink: 0;
  width: calc(10 * var(--rpx));
  position: relative;
  border-radius: calc(6 * var(--rpx));
  background: rgba(60, 58, 50, 0.1);
  touch-action: none;
  user-select: none;
}

.privacy-consent-scroll-thumb {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  border-radius: calc(6 * var(--rpx));
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.12);
  cursor: grab;
  touch-action: none;
}

.privacy-consent-scroll-thumb--dragging,
.privacy-consent-scroll-thumb:active {
  cursor: grabbing;
  filter: brightness(1.06);
}

.privacy-consent-layer-footer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  margin-top: calc(16 * var(--rpx));
}

.privacy-consent-btn {
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  touch-action: manipulation;
}

.privacy-consent-btn--agree {
  color: #f9f6f2;
  background: #5a8fb8;
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.08);
}

.privacy-consent-btn--decline {
  color: var(--text-dark, #3c3a32);
  background: var(--card, #eee4da);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
}

.privacy-consent-btn:hover {
  filter: brightness(1.05);
}

.privacy-consent-btn:active {
  filter: brightness(0.92);
}

.privacy-consent-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid rgba(60, 58, 50, 0.55);
  outline-offset: calc(2 * var(--rpx));
}

.privacy-consent-layer-enter-active,
.privacy-consent-layer-leave-active {
  transition: opacity calc(0.28s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
}

.privacy-consent-layer-enter-active .privacy-consent-layer-card,
.privacy-consent-layer-leave-active .privacy-consent-layer-card {
  transition:
    opacity calc(0.32s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out),
    transform calc(0.32s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
}

.privacy-consent-layer-enter-from,
.privacy-consent-layer-leave-to {
  opacity: 0;
}

.privacy-consent-layer-enter-from .privacy-consent-layer-card,
.privacy-consent-layer-leave-to .privacy-consent-layer-card {
  opacity: 0;
  transform: scale(0.96) translateY(calc(10 * var(--rpx)));
}
</style>
