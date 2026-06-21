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
          @click.stop
        >
          <div class="treasure-collection-title treasure-collection-enter-stagger">
            <span class="treasure-collection-title-main">宝藏</span>
            <span class="treasure-collection-title-count"> ({{ filledCount }})</span>
          </div>
          <div
            ref="gridAreaRef"
            class="treasure-collection-grid-area"
          >
            <TransitionGroup
              name="treasure-collection-grid"
              tag="div"
              :class="[
                'treasure-collection-grid',
                { 'treasure-collection-grid--dragging': dragActive },
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
                  v-if="slot"
                  :slot-index="i"
                  :treasure="slot"
                  :gem-class="gemClassForSlot(i, slot)"
                  :charge-state="chargeStateForSlot(i)"
                  :charge-progress="chargeProgressForSlot(i) ?? 0"
                  :amber-boss-mask="amberBossMask"
                  :crimson-hand-disabled="crimsonHandDisabledForSlot(i)"
                  @pointerdown="onSlotPointerDown(i, $event)"
                  @click="onSlotClick(i, slot, $event)"
                />
                <div
                  v-else-if="
                    dragActive
                    && dragInsertIndex === i
                    && dragSourceIndex !== dragInsertIndex
                    && dragTreasure
                  "
                  class="treasure-collection-drop-preview"
                >
                  <TreasureSlot
                    :treasure="dragTreasure"
                    :gem-class="dragGemClass"
                    :charge-state="dragChargeState"
                    :charge-progress="dragChargeProgress ?? 0"
                    :amber-boss-mask="amberBossMask"
                  />
                </div>
              </div>
            </TransitionGroup>
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
              v-if="dragGhostVisible"
              class="treasure-drag-ghost"
              :style="dragGhostStyle"
            >
              <TreasureSlot
                :treasure="dragTreasure"
                :gem-class="dragGemClass"
                :charge-state="dragChargeState"
                :charge-progress="dragChargeProgress ?? 0"
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
import { countFilledTreasureSlots } from "../game/treasureBarLayout.js";
import {
  TREASURE_COLLECTION_CELL_MIN_RPX,
  TREASURE_COLLECTION_CELL_SIZE_RPX,
  TREASURE_COLLECTION_GRID_GAP_RPX,
  computeCollectionGridCellPx,
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
  /** @type {import('vue').PropType<(index: number) => object | string | null>} */
  slotClassResolver: { type: Function, default: null },
  /** @type {import('vue').PropType<(index: number) => boolean>} */
  crimsonHandDisabledResolver: { type: Function, default: null },
  /** @type {import('vue').PropType<(preview: (object | null)[], keys: string[]) => void>} */
  onReorderCommit: { type: Function, default: null },
  dragGemClass: { type: String, default: "gem-rare" },
  dragChargeState: { type: String, default: null },
  dragChargeProgress: { type: Number, default: 0 },
});

const emit = defineEmits(["close", "slot-click", "empty-slot-click"]);

const stackZ = ref(0);
const portalStackStyle = computed(() =>
  stackZ.value > 0 ? { zIndex: stackZ.value } : undefined,
);

const innerRef = ref(null);
const gridAreaRef = ref(null);
const enterBoot = ref(false);
const gridCellPx = ref(0);
/** @type {import('vue').Ref<(HTMLElement | null)[]>} */
const cellRefs = ref([]);

function readRpx() {
  if (typeof document === "undefined") return 1;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx")) || 1;
}

function measureCollectionGrid() {
  const el = gridAreaRef.value;
  if (!(el instanceof HTMLElement)) return;
  const rpx = readRpx();
  const gapPx = TREASURE_COLLECTION_GRID_GAP_RPX * rpx;
  const maxCellPx = TREASURE_COLLECTION_CELL_SIZE_RPX * rpx;
  const minCellPx = TREASURE_COLLECTION_CELL_MIN_RPX * rpx;
  gridCellPx.value = computeCollectionGridCellPx({
    areaWidthPx: el.clientWidth,
    areaHeightPx: el.clientHeight,
    slotCount: props.ownedTreasures.length,
    gapPx,
    maxCellPx,
    minCellPx,
  });
}

let gridResizeObserver = null;

function bindGridResizeObserver() {
  gridResizeObserver?.disconnect();
  gridResizeObserver = null;
  const el = gridAreaRef.value;
  if (!(el instanceof HTMLElement)) return;
  if (typeof ResizeObserver === "undefined") return;
  gridResizeObserver = new ResizeObserver(() => measureCollectionGrid());
  gridResizeObserver.observe(el);
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
  dragInsertIndex,
  dragSourceIndex,
  dragGhostVisible,
  dragTreasure,
  dragGhostStyle,
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
});

const gridStyle = computed(() => {
  const px = gridCellPx.value;
  const fallback = TREASURE_COLLECTION_CELL_SIZE_RPX * readRpx();
  const cell = px > 0 ? px : fallback;
  return { "--treasure-collection-cell-size": `${cell}px` };
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
  padding: calc(16 * var(--rpx));
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
  width: min(calc(100% - 32 * var(--rpx)), min(96vw, calc(620 * var(--rpx))));
  max-width: min(96vw, calc(620 * var(--rpx)));
  height: min(72vh, calc(640 * var(--rpx)));
  max-height: min(88vh, calc(720 * var(--rpx)));
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

.treasure-collection-grid-area {
  flex: 1 1 auto;
  align-self: stretch;
  min-height: 0;
  width: 100%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.treasure-collection-grid {
  --treasure-collection-grid-gap: calc(12 * var(--rpx));
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--treasure-collection-cell-size));
  gap: var(--treasure-collection-grid-gap);
  justify-content: center;
  align-content: center;
  max-width: 100%;
  max-height: 100%;
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
  transition: transform calc(0.22s / var(--anim-speed-scale, 1)) ease;
}

.treasure-collection-drop-preview {
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.treasure-collection-drop-preview :deep(.treasure-slot.filled) {
  opacity: 0.42;
  box-shadow: none;
  cursor: default;
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
