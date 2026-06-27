<template>
  <Teleport defer to="#game-view-portal-frame">
    <Transition name="treasure-collection-layer">
      <div
        v-show="open"
        class="treasure-collection-layer portal-overlay-fill"
        :style="portalStackStyle"
        @click.self="emit('close')"
      >
        <div class="treasure-collection-scrim" aria-hidden="true" />
        <div
          ref="innerRef"
          class="treasure-collection-inner"
          :class="{ 'treasure-collection-inner--enter-boot': enterBoot }"
          :style="panelFrameStyle"
          @click.stop
        >
          <div class="treasure-collection-title treasure-collection-enter-stagger">
            <span class="treasure-collection-title-main">宝藏</span>
            <span class="treasure-collection-title-count"> ({{ filledCount }})</span>
          </div>
          <div ref="scrollOuterRef" class="treasure-collection-grid-scroll-outer" :style="scrollChromeStyle">
            <div
              ref="scrollBodyRef"
              class="treasure-collection-grid-area"
              :class="{
                'treasure-collection-grid-area--scrollable': gridNeedsScroll,
                'treasure-collection-grid-area--scroll-locked': dragActive,
              }"
              @scroll.passive="onGridScroll"
            >
              <div
                ref="gridContentRef"
                class="treasure-collection-grid-wrap"
                :style="gridWrapStyle"
              >
                <TransitionGroup
                  name="treasure-collection-grid"
                  tag="div"
                  :class="[
                    'treasure-collection-grid',
                    { 'treasure-collection-grid--dragging': gridReorderDragging },
                  ]"
                  :style="gridStyle"
                >
                  <div
                    v-for="(slot, i) in displaySlots"
                    :key="displayKeys[i] ?? `tc-slot-${i}`"
                    class="treasure-collection-cell treasure-collection-enter-stagger"
                    :ref="(el) => setCellRef(i, el)"
                  >
                    <TreasureSlot
                      :slot-index="i"
                      :treasure="slot"
                      :gem-class="gemClassForSlot(i, slot)"
                      :charge-state="chargeStateForSlot(i)"
                      :charge-progress="chargeProgressForSlot(i) ?? 0"
                      :effect-depleted="effectDepletedForSlot(i)"
                      :amber-boss-mask="amberBossMask"
                      :crimson-hand-disabled="crimsonHandDisabledForSlot(i)"
                      @pointerdown="onSlotPointerDown(i, $event)"
                      @click="onSlotClick(i, slot, $event)"
                    />
                  </div>
                </TransitionGroup>
              </div>
            </div>
            <div
              v-show="gridNeedsScroll"
              ref="scrollTrackRef"
              class="treasure-collection-scroll-track"
              aria-hidden="true"
              @pointerdown="onTrackPointerDown"
            >
              <div
                class="treasure-collection-scroll-thumb"
                :class="{ 'treasure-collection-scroll-thumb--dragging': thumbDragging }"
                :style="thumbStyle"
                @pointerdown.stop="onThumbPointerDown"
              >
                <div class="treasure-collection-scroll-thumb-grip" aria-hidden="true">
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="shop-btn shop-btn--buy treasure-collection-confirm treasure-collection-enter-stagger"
            @click="emit('close')"
          >
            确定
          </button>
          <div class="treasure-collection-drag-layer">
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
                :effect-depleted="dragEffectDepleted"
                :amber-boss-mask="amberBossMask"
              />
            </div>
            <div
              v-if="dragGhostVisible"
              class="treasure-drag-ghost"
              :style="dragGhostStyle"
            >
              <TreasureSlot
                :treasure="dragTreasure"
                :gem-class="dragGemClass"
                :charge-state="dragChargeState"
                :charge-progress="dragChargeProgress ?? 0"
                :effect-depleted="dragEffectDepleted"
                :amber-boss-mask="amberBossMask"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import TreasureSlot from "./TreasureSlot.vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { useTreasureGridReorder } from "../composables/useTreasureGridReorder.js";
import { usePanelScrollbar } from "../composables/usePanelScrollbar.js";
import { countFilledTreasureSlots } from "../game/treasureBarLayout.js";
import {
  TREASURE_COLLECTION_CELL_MIN_RPX,
  TREASURE_COLLECTION_CELL_SIZE_RPX,
  TREASURE_COLLECTION_GRID_GAP_RPX,
  TREASURE_COLLECTION_PANEL_HEIGHT_RPX,
  TREASURE_COLLECTION_PANEL_WIDTH_RPX,
  TREASURE_COLLECTION_SCROLLBAR_GAP_RPX,
  TREASURE_COLLECTION_SCROLLBAR_GUTTER_RPX,
  TREASURE_COLLECTION_SCROLLBAR_MIN_THUMB_RPX,
  TREASURE_COLLECTION_SCROLLBAR_THUMB_INSET_RPX,
  TREASURE_COLLECTION_SCROLLBAR_TRACK_RPX,
  computeCollectionGridContentHeightPx,
  measureCollectionGridLayout,
} from "../game/treasureCollectionLayout.js";
import {
  killTreasureCollectionLayerEnter,
  playTreasureCollectionLayerEnter,
  prepareTreasureCollectionLayerEnter,
} from "../game/treasureCollectionLayerEnterAnim.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent } from "../platform/haptics.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  ownedTreasures: { type: Array, default: () => [] },
  /** @type {import('vue').PropType<{ ref: import('vue').Ref<string[]> }>} */
  keyOrderBag: { type: Object, required: true },
  amberBossMask: { type: Boolean, default: false },
  /** @type {import('vue').PropType<(index: number, slot: object | null) => string>} */
  gemClassResolver: { type: Function, default: null },
  chargeStates: { type: Array, default: () => [] },
  chargeProgresses: { type: Array, default: () => [] },
  effectDepletedStates: { type: Array, default: () => [] },
  /** @type {import('vue').PropType<(index: number) => object | string | null>} */
  slotClassResolver: { type: Function, default: null },
  /** @type {import('vue').PropType<(index: number) => boolean>} */
  crimsonHandDisabledResolver: { type: Function, default: null },
  /** @type {import('vue').PropType<(preview: (object | null)[], keys: string[]) => void>} */
  onReorderCommit: { type: Function, default: null },
  dragGemClass: { type: String, default: "gem-rare" },
  dragChargeState: { type: String, default: null },
  dragChargeProgress: { type: Number, default: 0 },
  dragEffectDepleted: { type: Boolean, default: false },
});

const emit = defineEmits(["close", "slot-click", "empty-slot-click"]);

const stackZ = ref(0);
const portalStackStyle = computed(() =>
  stackZ.value > 0 ? { zIndex: stackZ.value } : undefined,
);

const panelFrameStyle = computed(() => ({
  width: `calc(${TREASURE_COLLECTION_PANEL_WIDTH_RPX} * var(--rpx))`,
  height: `calc(${TREASURE_COLLECTION_PANEL_HEIGHT_RPX} * var(--rpx))`,
  maxWidth: `calc(${TREASURE_COLLECTION_PANEL_WIDTH_RPX} * var(--rpx))`,
  maxHeight: `calc(${TREASURE_COLLECTION_PANEL_HEIGHT_RPX} * var(--rpx))`,
}));

const scrollChromeStyle = computed(() => ({
  "--tc-scroll-track-w": `calc(${TREASURE_COLLECTION_SCROLLBAR_TRACK_RPX} * var(--rpx))`,
  "--tc-scroll-track-gap": `calc(${TREASURE_COLLECTION_SCROLLBAR_GAP_RPX} * var(--rpx))`,
  "--tc-scroll-thumb-inset": `calc(${TREASURE_COLLECTION_SCROLLBAR_THUMB_INSET_RPX} * var(--rpx))`,
}));

const innerRef = ref(null);
const scrollOuterRef = ref(null);
const gridContentRef = ref(null);
const enterBoot = ref(false);
const gridCellPx = ref(0);
const gridNeedsScroll = ref(false);
/** @type {import('vue').Ref<(HTMLElement | null)[]>} */
const cellRefs = ref([]);

function readRpx() {
  if (typeof document === "undefined") return 1;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx")) || 1;
}

const {
  scrollBodyRef,
  scrollTrackRef,
  thumbDragging,
  thumbStyle,
  onScrollBody,
  onThumbPointerDown,
  onTrackPointerDown,
  updateScrollbarMetrics,
  bindResizeObserver: bindPanelScrollbarObserver,
} = usePanelScrollbar({
  thumbColor: "rgba(255, 255, 255, 0.42)",
  contentRef: gridContentRef,
  minThumbPx: () => TREASURE_COLLECTION_SCROLLBAR_MIN_THUMB_RPX * readRpx(),
  trackInset: () => TREASURE_COLLECTION_SCROLLBAR_THUMB_INSET_RPX * readRpx(),
});

function syncScrollbarMetrics() {
  if (gridNeedsScroll.value) updateScrollbarMetrics();
}

function onGridScroll() {
  if (gridNeedsScroll.value) onScrollBody();
}

function measureCollectionGrid() {
  const outer = scrollOuterRef.value;
  const el = scrollBodyRef.value;
  if (!(el instanceof HTMLElement)) return;
  const rpx = readRpx();
  const gapPx = TREASURE_COLLECTION_GRID_GAP_RPX * rpx;
  const maxCellPx = TREASURE_COLLECTION_CELL_SIZE_RPX * rpx;
  const minCellPx = TREASURE_COLLECTION_CELL_MIN_RPX * rpx;
  const gutterPx = TREASURE_COLLECTION_SCROLLBAR_GUTTER_RPX * rpx;
  const outerWidthPx = outer instanceof HTMLElement ? outer.clientWidth : el.clientWidth;
  const layout = measureCollectionGridLayout({
    areaWidthPx: Math.max(1, outerWidthPx - gutterPx),
    areaHeightPx: el.clientHeight,
    slotCount: props.ownedTreasures.length,
    gapPx,
    maxCellPx,
    minCellPx,
  });
  gridCellPx.value = layout.cellPx;
  gridNeedsScroll.value = layout.needsScroll;
  syncScrollbarMetrics();
}

let gridResizeObserver = null;

function bindGridResizeObserver() {
  gridResizeObserver?.disconnect();
  gridResizeObserver = null;
  const body = scrollBodyRef.value;
  const outer = scrollOuterRef.value;
  if (!(body instanceof HTMLElement)) return;
  if (typeof ResizeObserver === "undefined") return;
  gridResizeObserver = new ResizeObserver(() => {
    if (dragActive.value || dragSettling.value) return;
    measureCollectionGrid();
  });
  gridResizeObserver.observe(body);
  if (outer instanceof HTMLElement) gridResizeObserver.observe(outer);
  bindPanelScrollbarObserver();
}

watch(
  () => props.open,
  async (open, prev) => {
    if (open) {
      scheduleOverlayPresent(280);
      stackZ.value = bumpOverlayZ();
      enterBoot.value = true;
      await nextTick();
      prepareTreasureCollectionLayerEnter(innerRef.value);
      enterBoot.value = false;
      bindGridResizeObserver();
      measureCollectionGrid();
      requestAnimationFrame(() => {
        if (props.open && innerRef.value) {
          playTreasureCollectionLayerEnter(innerRef.value);
        }
      });
    } else if (prev) {
      scheduleOverlayDismiss(240);
      killTreasureCollectionLayerEnter(innerRef.value);
      gridResizeObserver?.disconnect();
      gridResizeObserver = null;
    }
  },
);

onMounted(() => {
  if (props.open) {
    nextTick(() => {
      bindGridResizeObserver();
      measureCollectionGrid();
    });
  }
});

onUnmounted(() => {
  killTreasureCollectionLayerEnter(innerRef.value);
  gridResizeObserver?.disconnect();
});

function setCellRef(i, el) {
  cellRefs.value[i] = el instanceof HTMLElement ? el : null;
}

const filledCount = computed(() => countFilledTreasureSlots(props.ownedTreasures));

const {
  dragActive,
  dragSettling,
  dragGhostVisible,
  dragPlaceholderVisible,
  dragTreasure,
  dragGhostStyle,
  dragPlaceholderStyle,
  displaySlots,
  displayKeys,
  onSlotPointerDown,
  dragMoved,
} = useTreasureGridReorder({
  getSourceSlots: () => props.ownedTreasures,
  keyOrder: props.keyOrderBag.ref,
  canDrag: () => props.open,
  onCommit: (preview) => {
    props.onReorderCommit?.(preview, [...props.keyOrderBag.ref.value]);
  },
  getSlotElement: (i) => cellRefs.value[i] ?? null,
  getOverlayContainer: () => innerRef.value,
  getScrollContainer: () => (gridNeedsScroll.value ? scrollBodyRef.value : null),
  onAutoScroll: () => syncScrollbarMetrics(),
});

/** 拖动与 ghost 落位期间禁用 grid FLIP，避免与跟随指针的 ghost 叠出多重外观 */
const gridReorderDragging = computed(() => dragActive.value || dragSettling.value);

watch(dragActive, (active) => {
  if (!active) syncScrollbarMetrics();
});

const gridStyle = computed(() => {
  const px = gridCellPx.value;
  const fallback = TREASURE_COLLECTION_CELL_SIZE_RPX * readRpx();
  const cell = px > 0 ? px : fallback;
  return { "--treasure-collection-cell-size": `${cell}px` };
});

/** 拖动预览会临时卸载槽内 TreasureSlot，用布局高度锁定 wrap，避免末行单格时容器塌缩 */
const gridWrapStyle = computed(() => {
  if (!gridReorderDragging.value || gridCellPx.value <= 0) return undefined;
  const outer = scrollOuterRef.value;
  if (!(outer instanceof HTMLElement)) return undefined;
  const rpx = readRpx();
  const heightPx = computeCollectionGridContentHeightPx({
    areaWidthPx: Math.max(
      1,
      outer.clientWidth - TREASURE_COLLECTION_SCROLLBAR_GUTTER_RPX * rpx,
    ),
    slotCount: props.ownedTreasures.length,
    cellPx: gridCellPx.value,
    gapPx: TREASURE_COLLECTION_GRID_GAP_RPX * rpx,
  });
  return { minHeight: `${heightPx}px` };
});

watch(
  () => props.ownedTreasures.length,
  () => {
    if (!props.open) return;
    requestAnimationFrame(measureCollectionGrid);
  },
);

/** @param {number} i @param {object | null} slot */
function gemClassForSlot(i, slot) {
  return props.gemClassResolver?.(i, slot) ?? "gem-rare";
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
function effectDepletedForSlot(i) {
  return props.effectDepletedStates[i] === true;
}

/** @param {number} i */
function crimsonHandDisabledForSlot(i) {
  return props.crimsonHandDisabledResolver?.(i) ?? false;
}

/** @param {number} i @param {object | null} slot @param {MouseEvent} e */
function onSlotClick(i, slot, e) {
  if (dragMoved.value) return;
  if (!slot) {
    emit("empty-slot-click", i, e);
    return;
  }
  emit("slot-click", i, slot, e);
}
</script>

<style scoped>
.treasure-collection-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.treasure-collection-scrim {
  position: absolute;
  inset: 0;
  border-radius: calc(12 * var(--rpx));
  background: rgba(0, 0, 0, 0.52);
  pointer-events: none;
}

.treasure-collection-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(16 * var(--rpx));
  flex-shrink: 0;
  padding: calc(24 * var(--rpx)) calc(18 * var(--rpx)) calc(22 * var(--rpx));
  border-radius: calc(14 * var(--rpx));
  background: #7a6f65;
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 calc(12 * var(--rpx)) calc(40 * var(--rpx)) rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}

.treasure-collection-inner--enter-boot .treasure-collection-enter-stagger {
  opacity: 0;
}

.treasure-collection-title {
  flex-shrink: 0;
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-shadow: 0 calc(1 * var(--rpx)) calc(2 * var(--rpx)) rgba(0, 0, 0, 0.2);
}

.treasure-collection-title-main {
  font-size: calc(30 * var(--rpx));
  color: rgba(255, 255, 255, 0.95);
}

.treasure-collection-title-count {
  font-size: calc(24 * var(--rpx));
  color: rgba(255, 255, 255, 0.68);
  font-weight: 600;
}

.treasure-collection-grid-scroll-outer {
  position: relative;
  flex: 1 1 auto;
  align-self: stretch;
  min-height: 0;
  width: 100%;
}

.treasure-collection-grid-area {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.treasure-collection-grid-area--scrollable {
  overflow-y: auto;
  padding-right: calc(var(--tc-scroll-track-gap, 0px) + var(--tc-scroll-track-w, 0px));
}

.treasure-collection-grid-area::-webkit-scrollbar {
  display: none;
}

.treasure-collection-grid-area--scroll-locked {
  overflow: hidden;
  touch-action: none;
}

.treasure-collection-grid-wrap {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  box-sizing: border-box;
  padding: calc(2 * var(--rpx)) 0;
}

.treasure-collection-scroll-track {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: var(--tc-scroll-track-w, calc(22 * var(--rpx)));
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.2);
  touch-action: none;
  user-select: none;
  z-index: 2;
}

.treasure-collection-scroll-thumb {
  position: absolute;
  left: var(--tc-scroll-thumb-inset, calc(3 * var(--rpx)));
  right: var(--tc-scroll-thumb-inset, calc(3 * var(--rpx)));
  top: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.22);
  cursor: grab;
  touch-action: none;
}

.treasure-collection-scroll-thumb-grip {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: calc(4 * var(--rpx));
  width: 58%;
  pointer-events: none;
}

.treasure-collection-scroll-thumb-grip span {
  display: block;
  height: calc(2.5 * var(--rpx));
  border-radius: calc(2 * var(--rpx));
  background: rgba(255, 255, 255, 0.78);
}

.treasure-collection-scroll-thumb--dragging,
.treasure-collection-scroll-thumb:active {
  cursor: grabbing;
  filter: brightness(1.08);
}

.treasure-collection-grid {
  --treasure-collection-grid-gap: calc(12 * var(--rpx));
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--treasure-collection-cell-size));
  gap: var(--treasure-collection-grid-gap);
  justify-content: center;
  align-content: start;
  max-width: 100%;
}

.treasure-collection-cell {
  width: var(--treasure-collection-cell-size);
  height: var(--treasure-collection-cell-size);
}

.treasure-collection-drag-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  overflow: visible;
}

.treasure-collection-cell :deep(.treasure-slot) {
  width: 100%;
  height: 100%;
  flex: none;
}

.treasure-collection-confirm {
  flex-shrink: 0;
  width: 100%;
  max-width: calc(280 * var(--rpx));
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-size: calc(24 * var(--rpx));
}

.treasure-collection-grid-move {
  transition: none;
}

.treasure-collection-grid--dragging .treasure-collection-grid-move {
  transition: none;
  transform: none !important;
}

.treasure-collection-grid--dragging .treasure-collection-cell {
  transform: none !important;
}

:global(html.reduce-motion) .treasure-collection-grid--dragging .treasure-collection-grid-move {
  transition: none;
}

.treasure-collection-layer-enter-active .treasure-collection-scrim,
.treasure-collection-layer-leave-active .treasure-collection-scrim {
  transition: opacity calc(0.22s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
}

.treasure-collection-layer-enter-active .treasure-collection-inner,
.treasure-collection-layer-leave-active .treasure-collection-inner {
  transition: transform calc(0.28s / var(--anim-speed-scale, 1)) var(--ease-expo-out, ease-out);
}

.treasure-collection-layer-enter-from .treasure-collection-scrim,
.treasure-collection-layer-leave-to .treasure-collection-scrim {
  opacity: 0;
}

.treasure-collection-layer-enter-from .treasure-collection-inner,
.treasure-collection-layer-leave-to .treasure-collection-inner {
  transform: scale(0.94) translateY(calc(12 * var(--rpx)));
}
</style>
