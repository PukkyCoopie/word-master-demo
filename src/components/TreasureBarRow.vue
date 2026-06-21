<template>
  <div
    ref="containerRef"
    class="treasure-slots-ctn"
    :class="[containerClass, { 'treasure-slots-ctn--stack': stackMode }]"
    :style="stackMode ? stackContainerStyle : undefined"
    aria-label="宝藏槽位"
  >
    <div class="treasure-slots-row">
      <TransitionGroup
        name="treasure-slot-reorder"
        tag="div"
        :class="[
          'treasure-slots',
          { 'treasure-slots--dragging': dragActive, 'treasure-slots--stack': stackMode },
          { 'treasure-slots--compact-animating': compactAnimating },
          layoutClass,
        ]"
        :style="stackMode ? stackSlotsStyle : undefined"
      >
        <TreasureSlot
          v-for="(slot, i) in displaySlots"
          :key="displayKeys[i] ?? `treasure-slot-${i}`"
          :ref="(el) => setSlotRef(i, el)"
          :slot-index="i"
          :treasure="slot"
          :gem-class="gemClassForSlot(i, slot)"
          :charge-state="chargeStateForSlot(i)"
          :charge-progress="chargeProgressForSlot(i) ?? 0"
          :amber-boss-mask="amberBossMask"
          :crimson-hand-disabled="crimsonHandDisabledForSlot(i)"
          :slot-class="slotClassForIndex(i)"
          :stack-overlap-shadow="stackMode && !!slot && i < displaySlots.length - 1"
          :style="stackMode ? stackItemStyle(i) : undefined"
          @pointerdown="onSlotPointerDown(i, $event)"
          @click="onSlotClick(i, slot, $event)"
        />
      </TransitionGroup>
      <button
        v-if="stackMode && showExpandButton"
        type="button"
        class="treasure-bar-expand-btn"
        aria-label="查看全部宝藏"
        title="查看全部宝藏"
        @click.stop="emit('expand-click')"
      >
        <i class="ri-arrow-up-double-line" aria-hidden="true" />
      </button>
    </div>
    <div v-if="dragGhostVisible" class="treasure-drag-ghost" :style="dragGhostStyle">
      <TreasureSlot
        :treasure="dragTreasure"
        :gem-class="dragGemClass"
        :charge-state="dragChargeState"
        :charge-progress="dragChargeProgress ?? 0"
        :amber-boss-mask="amberBossMask"
        :crimson-hand-disabled="dragCrimsonHandDisabled"
      />
    </div>
    <div
      v-if="dragPlaceholderVisible"
      class="treasure-drag-placeholder"
      :style="dragPlaceholderStyle"
    >
      <TreasureSlot
        :treasure="dragTreasure"
        :gem-class="dragGemClass"
        :charge-state="dragChargeState"
        :charge-progress="dragChargeProgress ?? 0"
        :amber-boss-mask="amberBossMask"
        :crimson-hand-disabled="dragCrimsonHandDisabled"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import TreasureSlot from "./TreasureSlot.vue";
import {
  TREASURE_BAR_SLOT_GAP_RPX,
  TREASURE_STACK_EXPAND_BTN_RPX,
  TREASURE_STACK_ROW_GAP_RPX,
  computeStackAvailWidthPx,
  computeStackCardSizePx,
  computeStackStepPx,
} from "../game/treasureBarLayout.js";

const props = defineProps({
  displaySlots: { type: Array, default: () => [] },
  displayKeys: { type: Array, default: () => [] },
  layoutClass: { type: String, default: "" },
  stackMode: { type: Boolean, default: false },
  filledCount: { type: Number, default: 0 },
  compactAnimating: { type: Boolean, default: false },
  showExpandButton: { type: Boolean, default: true },
  containerClass: { type: [String, Array, Object], default: null },
  dragActive: { type: Boolean, default: false },
  dragGhostVisible: { type: Boolean, default: false },
  dragPlaceholderVisible: { type: Boolean, default: false },
  dragTreasure: { type: Object, default: null },
  dragGhostStyle: { type: Object, default: () => ({}) },
  dragPlaceholderStyle: { type: Object, default: () => ({}) },
  dragGemClass: { type: String, default: "gem-rare" },
  dragChargeState: { type: String, default: null },
  dragChargeProgress: { type: Number, default: 0 },
  dragCrimsonHandDisabled: { type: Boolean, default: false },
  amberBossMask: { type: Boolean, default: false },
  /** @type {import('vue').PropType<(index: number, slot: object | null) => string>} */
  gemClassResolver: { type: Function, default: null },
  chargeStates: { type: Array, default: () => [] },
  chargeProgresses: { type: Array, default: () => [] },
  /** @type {import('vue').PropType<(index: number) => object | string | null>} */
  slotClassResolver: { type: Function, default: null },
  /** @type {import('vue').PropType<(index: number) => boolean>} */
  crimsonHandDisabledResolver: { type: Function, default: null },
  /** @type {import('vue').PropType<(index: number, el: import('vue').ComponentPublicInstance | null) => void>} */
  registerSlotRef: { type: Function, default: null },
});

const emit = defineEmits([
  "slot-pointerdown",
  "slot-click",
  "empty-slot-click",
  "expand-click",
]);

const containerRef = ref(null);
const containerWidthPx = ref(0);
/** @type {import('vue').Ref<(import('vue').ComponentPublicInstance | null)[]>} */
const slotRefs = ref([]);

function setSlotRef(i, el) {
  slotRefs[i] = el;
  props.registerSlotRef?.(i, el);
}

function measureContainer() {
  const el = containerRef.value;
  if (!(el instanceof HTMLElement)) return;
  const rect = el.getBoundingClientRect();
  const style = getComputedStyle(el);
  const padL = parseFloat(style.paddingLeft) || 0;
  const padR = parseFloat(style.paddingRight) || 0;
  containerWidthPx.value = Math.max(0, rect.width - padL - padR);
}

let resizeObserver = null;

onMounted(() => {
  measureContainer();
  if (typeof ResizeObserver !== "undefined" && containerRef.value instanceof HTMLElement) {
    resizeObserver = new ResizeObserver(() => measureContainer());
    resizeObserver.observe(containerRef.value);
  } else {
    window.addEventListener("resize", measureContainer);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("resize", measureContainer);
});

watch(
  () => [props.displaySlots.length, props.stackMode],
  () => {
    requestAnimationFrame(measureContainer);
  },
);

const stackLayoutPx = computed(() => {
  if (!props.stackMode) {
    return { cardPx: 0, expandPx: 0, gapPx: 0, availPx: 0, stepPx: 0 };
  }
  const rpx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx")) || 1;
  const slotGapPx = TREASURE_BAR_SLOT_GAP_RPX * rpx;
  const cardPx = computeStackCardSizePx({
    containerWidthPx: containerWidthPx.value,
    slotGapPx,
  });
  const expandPx = TREASURE_STACK_EXPAND_BTN_RPX * rpx;
  const gapPx = TREASURE_STACK_ROW_GAP_RPX * rpx;
  const availPx = computeStackAvailWidthPx({
    containerWidthPx: containerWidthPx.value,
    cardWidthPx: cardPx,
    expandBtnWidthPx: expandPx,
    rowGapPx: gapPx,
  });
  const stepPx = computeStackStepPx({
    slotCount: props.displaySlots.length,
    containerWidthPx: containerWidthPx.value,
    cardWidthPx: cardPx,
    expandBtnWidthPx: expandPx,
    rowGapPx: gapPx,
  });
  return { cardPx, expandPx, gapPx, availPx, stepPx };
});

const stackContainerStyle = computed(() => {
  if (!props.stackMode) return undefined;
  const { cardPx } = stackLayoutPx.value;
  return { "--treasure-stack-card-size": `${cardPx}px` };
});

const stackSlotsStyle = computed(() => {
  const { availPx, stepPx } = stackLayoutPx.value;
  return {
    "--treasure-stack-step": `${stepPx}px`,
    width: `${availPx}px`,
    maxWidth: "100%",
  };
});

/** @param {number} i */
function stackItemStyle(i) {
  const n = Math.max(1, props.displaySlots.length);
  const z = n - i;
  if (i <= 0) return { zIndex: String(z) };
  return {
    marginLeft: `calc(var(--treasure-stack-step, 0px) - var(--treasure-stack-card-size, 0px))`,
    zIndex: String(z),
  };
}

/** @param {number} i @param {object | null} slot */
function gemClassForSlot(i, slot) {
  if (props.gemClassResolver) return props.gemClassResolver(i, slot);
  return "gem-rare";
}

/** @param {number} i */
function chargeStateForSlot(i) {
  return props.chargeStates[i] ?? null;
}

/** @param {number} i */
function chargeProgressForSlot(i) {
  return props.chargeProgresses[i] ?? 0;
}

/** @param {number} i */
function slotClassForIndex(i) {
  return props.slotClassResolver?.(i) ?? null;
}

/** @param {number} i */
function crimsonHandDisabledForSlot(i) {
  return props.crimsonHandDisabledResolver?.(i) ?? false;
}

/** @param {number} i @param {PointerEvent} e */
function onSlotPointerDown(i, e) {
  emit("slot-pointerdown", i, e);
}

/** @param {number} i @param {object | null} slot @param {MouseEvent} e */
function onSlotClick(i, slot, e) {
  if (!slot) {
    emit("empty-slot-click", i, e);
    return;
  }
  emit("slot-click", i, slot, e);
}

function getSlotEl(index) {
  const ref = slotRefs.value[index];
  return ref?.getEl?.() ?? ref?.$el ?? null;
}

defineExpose({
  getContainerEl: () => containerRef.value,
  getSlotEl,
});
</script>

<style scoped>
.treasure-slots-row {
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
  gap: calc(6 * var(--rpx));
}

.treasure-slots-row .treasure-slots:not(.treasure-slots--stack) {
  flex: 1 1 auto;
  min-width: 0;
}
</style>
