<template>
  <div
    ref="rootRef"
    class="segment-tab"
    :class="[
      `segment-tab--${variant}`,
      {
        'segment-tab--disabled': disabled,
        'segment-tab--fill': fill,
      },
    ]"
    :role="role"
    :aria-label="ariaLabel"
    :style="rootStyle"
  >
    <div
      class="segment-tab-thumb"
      :class="{
        'segment-tab-thumb--instant': slideInstant,
        'segment-tab-thumb--equal': !variableWidthTabs,
      }"
      aria-hidden="true"
      :style="thumbStyle"
    >
      <div ref="pulseRef" class="tab-thumb-pulse" />
    </div>
    <button
      v-for="opt in visibleOptions"
      :key="opt.id"
      :ref="(el) => setTabEl(opt.id, el)"
      type="button"
      :role="role === 'tablist' ? 'tab' : undefined"
      class="segment-tab-btn"
      :class="{
        'segment-tab-btn--active': modelValue === opt.id,
        'segment-tab-btn--wide': opt.wide,
        'segment-tab-btn--disabled': opt.disabled,
      }"
      :aria-selected="role === 'tablist' ? modelValue === opt.id : undefined"
      :aria-pressed="role === 'group' ? modelValue === opt.id : undefined"
      :aria-disabled="opt.disabled || undefined"
      :disabled="opt.disabled"
      :aria-label="opt.ariaLabel || opt.label || undefined"
      @click="onSelect(opt)"
    >
      <slot name="tab" :option="opt">
        <i v-if="opt.iconClass" :class="opt.iconClass" aria-hidden="true" />
        <template v-else>{{ opt.label }}</template>
      </slot>
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { isHapticsAvailable, triggerHaptic } from "../platform/haptics.js";
import { useMeasuredSegmentThumb } from "../ui/useMeasuredSegmentThumb.js";

/**
 * @typedef {object} SegmentTabOption
 * @property {string} id
 * @property {string} [label]
 * @property {string} [iconClass]
 * @property {string} [ariaLabel]
 * @property {boolean} [wide]
 * @property {boolean} [disabled]
 * @property {boolean} [hidden]
 */

const props = defineProps({
  modelValue: { type: String, required: true },
  options: { type: Array, required: true },
  /** neutral | collection | about | run-start | settings-layer | info */
  variant: { type: String, default: "neutral" },
  ariaLabel: { type: String, default: "选项" },
  role: {
    type: String,
    default: "tablist",
    validator: (v) => v === "tablist" || v === "group",
  },
  disabled: { type: Boolean, default: false },
  /** 为 true 时滑块瞬时定位（弹窗打开、布局 settle 等） */
  repositionInstant: { type: Boolean, default: false },
  fill: { type: Boolean, default: false },
  haptic: { type: Boolean, default: true },
});

const emit = defineEmits(["update:modelValue"]);

const rootRef = ref(/** @type {HTMLElement | null} */ (null));
/** @type {Record<string, HTMLElement | undefined>} */
const tabElById = {};

/** @type {import('vue').ComputedRef<SegmentTabOption[]>} */
const visibleOptions = computed(() =>
  /** @type {SegmentTabOption[]} */ (props.options).filter((o) => !o.hidden),
);

const variableWidthTabs = computed(() =>
  visibleOptions.value.some((o) => o.wide),
);

const activeIndex = computed(() => {
  const idx = visibleOptions.value.findIndex((o) => o.id === props.modelValue);
  return idx >= 0 ? idx : 0;
});

const rootStyle = computed(() => {
  /** @type {Record<string, string | number>} */
  const style = {
    "--segment-count": String(Math.max(1, visibleOptions.value.length)),
  };
  if (props.disabled) {
    style.opacity = "0.45";
    style.pointerEvents = "none";
  }
  return style;
});

/**
 * @param {string} id
 * @param {import('vue').ComponentPublicInstance | Element | null} el
 */
function setTabEl(id, el) {
  const node = el instanceof HTMLElement ? el : null;
  if (node) {
    tabElById[id] = node;
  } else {
    delete tabElById[id];
  }
}

/** @param {string | number} id */
function getTabEl(id) {
  const direct = tabElById[String(id)];
  if (direct) return direct;
  const opt = visibleOptions.value[activeIndex.value];
  return opt ? tabElById[opt.id] ?? null : null;
}

const { thumbStyle, slideInstant, pulseRef, scheduleUpdateThumb } = useMeasuredSegmentThumb(
  () => props.modelValue,
  getTabEl,
  rootRef,
  {
    repositionInstant: () => props.repositionInstant,
    variableWidth: variableWidthTabs,
    activeIndex,
    tabCount: computed(() => visibleOptions.value.length),
  },
);

/** @param {SegmentTabOption} opt */
function onSelect(opt) {
  if (props.disabled || opt.disabled || opt.id === props.modelValue) return;
  if (props.haptic && isHapticsAvailable()) triggerHaptic("tabSwitch");
  emit("update:modelValue", opt.id);
}

defineExpose({
  /** @param {{ instant?: boolean }} [opts] */
  reposition(opts = { instant: true }) {
    scheduleUpdateThumb(opts);
  },
});
</script>

<style scoped>
.segment-tab {
  --segment-pad: calc(4 * var(--rpx));
  --segment-track: rgba(0, 0, 0, 0.08);
  --segment-thumb: var(--card-bright, #f9f6f2);
  --segment-fg: var(--text-dark, #3c3a32);
  --segment-fg-active: var(--text-dark, #3c3a32);
  --segment-focus: #5a8fb8;
  --segment-btn-pad-y: calc(8 * var(--rpx));
  --segment-btn-pad-x: calc(6 * var(--rpx));
  --segment-font-size: calc(22 * var(--rpx));
  --segment-btn-flex: 1;
  position: relative;
  display: flex;
  align-items: stretch;
  min-width: 0;
  gap: 0;
  padding: var(--segment-pad);
  border-radius: calc(8 * var(--rpx));
  background: var(--segment-track);
  box-sizing: border-box;
  overflow: visible;
}

.segment-tab--neutral {
  flex: 1 1 auto;
  max-width: calc(320 * var(--rpx));
}

.segment-tab--fill {
  max-width: none;
  width: 100%;
}

.segment-tab--collection {
  --segment-pad: calc(5 * var(--rpx) * 1.1);
  --segment-track: var(--collection-purple, #7b68a8);
  --segment-thumb: var(--collection-purple-dark, #554a72);
  --segment-fg: var(--collection-purple-fg, #f9f6f2);
  --segment-fg-active: var(--collection-purple-fg, #f9f6f2);
  --segment-focus: var(--collection-purple-fg, #f9f6f2);
  --segment-btn-pad-y: calc(12 * var(--rpx) * 1.1);
  --segment-btn-pad-x: calc(4 * var(--rpx));
  --segment-font-size: calc(36 * var(--rpx) * 1.1);
  min-height: calc(2 * var(--segment-btn-pad-y) + var(--segment-font-size));
}

.segment-tab--about {
  --segment-track: rgba(0, 0, 0, 0.08);
  --segment-thumb: var(--btn-green, #7cb342);
  --segment-fg: var(--text-dark, #3c3a32);
  --segment-fg-active: #f9f6f2;
  --segment-focus: var(--btn-green, #7cb342);
  --segment-btn-pad-y: calc(10 * var(--rpx));
  --segment-btn-pad-x: calc(12 * var(--rpx));
  --segment-font-size: calc(24 * var(--rpx));
}

.segment-tab--run-start {
  --segment-track: rgba(0, 0, 0, 0.08);
  --segment-thumb: var(--run-start-blue, #5a8fb8);
  --segment-fg: var(--text-dark, #3c3a32);
  --segment-fg-active: var(--run-start-blue-fg, #f9f6f2);
  --segment-focus: var(--run-start-blue, #5a8fb8);
  --segment-btn-pad-y: calc(10 * var(--rpx));
  --segment-btn-pad-x: calc(12 * var(--rpx));
  --segment-font-size: calc(24 * var(--rpx));
}

.segment-tab--settings-layer {
  --segment-track: rgba(0, 0, 0, 0.08);
  --segment-thumb: #d4954a;
  --segment-fg: var(--text-dark, #3c3a32);
  --segment-fg-active: #f9f6f2;
  --segment-focus: #d4954a;
  --segment-btn-pad-y: calc(10 * var(--rpx));
  --segment-btn-pad-x: calc(12 * var(--rpx));
  --segment-font-size: calc(24 * var(--rpx));
}

.segment-tab--info {
  --segment-pad: calc(6 * var(--rpx));
  --segment-track: #ed8c5c;
  --segment-thumb: #fff;
  --segment-fg: #faf8ef;
  --segment-fg-active: var(--text-dark, #3c3a32);
  --segment-focus: #ed8c5c;
  --segment-btn-pad-y: calc(14 * var(--rpx));
  --segment-btn-pad-x: calc(6 * var(--rpx));
  --segment-font-size: calc(24 * var(--rpx));
  --segment-btn-flex: 1 1 0;
}

.segment-tab-thumb {
  position: absolute;
  top: var(--segment-pad);
  bottom: var(--segment-pad);
  left: 0;
  border-radius: calc(6 * var(--rpx));
  background: transparent;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
  transition: transform calc(0.48s / var(--anim-speed-scale, 1)) cubic-bezier(0.16, 1, 0.3, 1);
}

.segment-tab-thumb--equal {
  width: calc((100% - 2 * var(--segment-pad)) / var(--segment-count));
}

.segment-tab-thumb:not(.segment-tab-thumb--equal) {
  transition:
    transform calc(0.48s / var(--anim-speed-scale, 1)) cubic-bezier(0.16, 1, 0.3, 1),
    width calc(0.48s / var(--anim-speed-scale, 1)) cubic-bezier(0.16, 1, 0.3, 1);
}

.segment-tab-thumb--instant {
  transition: none !important;
}

.segment-tab-thumb .tab-thumb-pulse {
  background: var(--segment-thumb);
}

.segment-tab-btn {
  flex: var(--segment-btn-flex, 1);
  min-width: 0;
  position: relative;
  z-index: 1;
  border: none;
  padding: var(--segment-btn-pad-y) var(--segment-btn-pad-x);
  font-family: inherit;
  font-size: var(--segment-font-size);
  font-weight: 700;
  line-height: 1.25;
  color: var(--segment-fg);
  background: transparent;
  cursor: pointer;
  border-radius: calc(6 * var(--rpx));
  opacity: 0.72;
  white-space: nowrap;
  transition:
    color 0.12s ease,
    opacity 0.12s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.segment-tab--collection .segment-tab-btn {
  line-height: 1;
  opacity: 0.62;
  min-height: calc(2 * var(--segment-btn-pad-y) + var(--segment-font-size));
}

.segment-tab--info .segment-tab-btn {
  opacity: 0.82;
}

.segment-tab-btn--wide {
  flex: 1.42 1 0;
}

.segment-tab-btn--active {
  color: var(--segment-fg-active);
  opacity: 1;
}

.segment-tab-btn:hover:not(.segment-tab-btn--active):not(:disabled) {
  opacity: 0.88;
}

.segment-tab--collection .segment-tab-btn:hover:not(.segment-tab-btn--active):not(:disabled) {
  opacity: 0.82;
}

.segment-tab-btn:active:not(.segment-tab-btn--active):not(:disabled) {
  opacity: 0.62;
}

.segment-tab-btn--disabled,
.segment-tab-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.segment-tab-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid var(--segment-focus);
  outline-offset: calc(1 * var(--rpx));
}

</style>
