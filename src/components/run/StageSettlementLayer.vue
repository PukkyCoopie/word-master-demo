<script setup>
import { computed, inject, ref, watch, onUnmounted } from "vue";
import { settlementDollarMarks } from "../../game/moneyDisplay.js";
import {
  buildSettlementDisplayRows,
  settlementCountForRow,
  computeSettlementTotalScale,
  settlementTotalNeedsWrap,
} from "../../game/buildSettlementSnapshot.js";
import { createStageSettlementAnimController, refToDom } from "../../game/stageSettlementAnim.js";
import { triggerHaptic } from "../../platform/haptics.js";
import { RUN_SESSION_KEY } from "../../runSession/useRunSession.js";

const props = defineProps({
  open: { type: Boolean, default: false },
  snapshot: { type: Object, default: null },
  disableLayerAnim: { type: Boolean, default: false },
  portalStackStyle: { type: Object, default: undefined },
});

const emit = defineEmits(["continue"]);

/** @type {import('../../runSession/runSessionTypes.js').RunSession | undefined} */
const session = inject(RUN_SESSION_KEY, undefined);
const settlementUi = session?.ui?.settlement ?? null;

const layerOpen = computed(() => settlementUi?.open?.value ?? props.open);
const layerSnapshot = computed(() => settlementUi?.snapshot?.value ?? props.snapshot);
const layerDisableAnim = computed(
  () => settlementUi?.disableLayerAnim?.value ?? props.disableLayerAnim,
);
const layerPortalStackStyle = computed(
  () => settlementUi?.portalStackStyle?.value ?? props.portalStackStyle,
);

const settlementCardRef = ref(/** @type {HTMLElement | null} */ (null));
const settlementContinueBtnRef = ref(/** @type {HTMLButtonElement | null} */ (null));
const animSettleRows = ref([0, 0, 0, 0]);

/** @type {(HTMLElement | null)[]} */
const settlementRowEls = [];

/** @param {number} index @param {unknown} el */
function setSettlementRowRef(index, el) {
  const node = refToDom(el);
  if (node) settlementRowEls[index] = node;
  else settlementRowEls[index] = null;
}

const settlementDisplayRows = computed(() => buildSettlementDisplayRows(layerSnapshot.value));

function countForRow(row) {
  return settlementCountForRow(layerSnapshot.value, row);
}

const settlementTotalScale = computed(() => {
  const totalRow = settlementDisplayRows.value.find((r) => r.isTotal);
  const raw = totalRow
    ? Math.round(Number(animSettleRows.value[settlementDisplayRows.value.indexOf(totalRow)]) || 0)
    : Math.round(Number(animSettleRows.value[animSettleRows.value.length - 1]) || 0);
  return computeSettlementTotalScale(raw);
});

const settlementTotalNeedsWrapComputed = computed(() => {
  const totalRow = settlementDisplayRows.value.find((r) => r.isTotal);
  const ix = totalRow ? settlementDisplayRows.value.indexOf(totalRow) : animSettleRows.value.length - 1;
  const count = Math.abs(Math.round(Number(animSettleRows.value[ix]) || 0));
  return settlementTotalNeedsWrap(count);
});

const settlementTotalValueStyle = computed(() => ({
  "--settle-total-scale": String(settlementTotalScale.value),
}));

const anim = createStageSettlementAnimController({
  getSnapshot: () => layerSnapshot.value,
  getDisplayRows: () => settlementDisplayRows.value,
  getCountForRow: countForRow,
  animSettleRows,
  settlementCardRef,
  settlementContinueBtnRef,
  getRowEls: () => settlementRowEls,
  isOpen: () => layerOpen.value,
  triggerHaptic,
});

function onOverlayPointerDown(ev) {
  if (!layerOpen.value) return;
  const btn = settlementContinueBtnRef.value;
  if (btn && (btn === ev.target || btn.contains(/** @type {Node} */ (ev.target)))) return;
  anim.finishIntroInstant();
}

function onContinueClick(event) {
  if (typeof settlementUi?.onContinue === "function") {
    settlementUi.onContinue(event);
    return;
  }
  emit("continue", event);
}

watch(
  () => layerSnapshot.value,
  () => {
    if (!layerOpen.value) anim.resetAnimValues();
  },
);

defineExpose({
  runIntro: () => anim.runIntro(),
  finishIntroInstant: () => anim.finishIntroInstant(),
  isIntroPending: () => anim.isIntroPending(),
  resetAnimValues: () => anim.resetAnimValues(),
  dispose: () => anim.dispose(),
});

onUnmounted(() => {
  anim.dispose();
});
</script>

<template>
  <Teleport defer to="#game-view-portal-frame">
    <Transition name="settle-layer" :css="!layerDisableAnim">
      <div
        v-if="layerOpen"
        class="stage-settlement-layer portal-overlay-fill"
        :style="layerPortalStackStyle"
        aria-modal="true"
        role="dialog"
        aria-labelledby="settlement-title"
        @pointerdown="onOverlayPointerDown"
      >
        <div ref="settlementCardRef" class="stage-settlement-card">
          <h2 id="settlement-title" class="stage-settlement-title">关卡完成</h2>
          <p class="stage-settlement-sub">得分已达标，获得以下金币</p>
          <div class="stage-settlement-rows">
            <div
              v-for="(row, i) in settlementDisplayRows"
              :key="row.key"
              class="settle-row"
              :class="{
                'settle-row-total': row.isTotal,
                'settle-row--empty': countForRow(row) === 0,
                'settle-row--deduction': row.isDeduction,
              }"
              :ref="(el) => setSettlementRowRef(i, el)"
            >
              <span class="settle-label">{{ row.label }}</span>
              <span
                class="settle-value settle-dollars"
                :class="{
                  'settle-total': row.isTotal,
                  'settle-total--wrapped': row.isTotal && settlementTotalNeedsWrapComputed,
                  'settle-dollars--debt': row.isDeduction || (animSettleRows[i] ?? 0) < 0,
                  'settle-dollars--deduction': row.isDeduction,
                }"
                :style="row.isTotal ? settlementTotalValueStyle : undefined"
                >{{ settlementDollarMarks(animSettleRows[i] ?? 0) }}</span
              >
            </div>
          </div>
          <button
            ref="settlementContinueBtnRef"
            type="button"
            class="stage-settlement-btn"
            @pointerdown.stop
            @click="onContinueClick"
          >
            继续
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.stage-settlement-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(32 * var(--rpx)) calc(24 * var(--rpx));
  background: rgba(110, 196, 240, 0.8);
  border-radius: calc(12 * var(--rpx));
  box-sizing: border-box;
}

.stage-settlement-card {
  width: 100%;
  max-width: calc(680 * var(--rpx));
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(32 * var(--rpx)) calc(26 * var(--rpx));
  box-shadow: var(--shadow);
  border: none;
}

.stage-settlement-title {
  margin: 0 0 calc(8 * var(--rpx));
  font-size: calc(40 * var(--rpx));
  font-weight: 700;
  color: var(--text);
  text-align: center;
  letter-spacing: 0.02em;
}

.stage-settlement-sub {
  margin: 0 0 calc(24 * var(--rpx));
  font-size: calc(26 * var(--rpx));
  color: var(--text-soft);
  text-align: center;
  line-height: 1.45;
}

.stage-settlement-rows {
  display: flex;
  flex-direction: column;
  gap: calc(12 * var(--rpx));
  margin-bottom: calc(26 * var(--rpx));
}

.settle-row {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(14 * var(--rpx));
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  min-height: calc(76 * var(--rpx));
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.55);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: opacity 0.25s var(--ease-expo-out);
  transform-origin: 50% 50%;
}

.settle-row--empty {
  opacity: 0.42;
}

.settle-row-total {
  background: rgba(255, 255, 255, 0.72);
}

.settle-row-total.settle-row--empty {
  opacity: 0.42;
}

.settle-label {
  font-size: calc(26 * var(--rpx));
  font-weight: 600;
  color: var(--text-soft);
  flex-shrink: 0;
}

.settle-value.settle-dollars {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 0;
  min-height: calc(38 * var(--rpx));
  font-size: calc(31 * var(--rpx));
  font-weight: 800;
  line-height: 1;
  color: var(--money-gold);
  letter-spacing: 0.06em;
  text-align: right;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.35);
}

.settle-dollars--debt,
.settle-total.settle-dollars--debt {
  color: var(--money-debt) !important;
  text-shadow: 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.2);
}

.settle-dollars--deduction {
  color: var(--settlement-deduction) !important;
  text-shadow: 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.16);
}

.settle-total {
  font-size: calc(36 * var(--rpx) * var(--settle-total-scale, 1)) !important;
  font-weight: 800 !important;
  min-height: calc(43 * var(--rpx)) !important;
  color: var(--money-gold) !important;
  margin-left: calc(8 * var(--rpx));
}

.settle-total--wrapped {
  flex-shrink: 1 !important;
  max-width: 62%;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-all;
  line-height: 1.15 !important;
  text-align: right;
}

.stage-settlement-btn {
  width: 100%;
  border: none;
  border-radius: var(--radius);
  padding: calc(16 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  color: #f9f6f2;
  background: #5a8fb8;
  box-shadow: var(--shadow);
  cursor: pointer;
  position: relative;
  transition: transform 0.1s var(--ease-expo-out);
}
.stage-settlement-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: transparent;
  transition: background 0.12s ease;
}
.stage-settlement-btn:hover:not(:disabled)::after {
  background: rgba(255, 255, 255, 0.08);
}
.stage-settlement-btn:active:not(:disabled) {
  transform: scale(0.99);
}
.stage-settlement-btn:active:not(:disabled)::after {
  background: rgba(0, 0, 0, 0.07);
}
.stage-settlement-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.settle-layer-enter-active,
.settle-layer-leave-active {
  transition: opacity 0.28s var(--ease-expo-out);
}

.settle-layer-enter-active .stage-settlement-card,
.settle-layer-leave-active .stage-settlement-card {
  transition:
    opacity 0.32s var(--ease-expo-out),
    transform 0.32s var(--ease-expo-out);
}

.settle-layer-enter-from,
.settle-layer-leave-to {
  opacity: 0;
}

.settle-layer-enter-from .stage-settlement-card,
.settle-layer-leave-to .stage-settlement-card {
  opacity: 0;
  transform: scale(0.94) translateY(12px);
}
</style>
