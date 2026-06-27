<template>
  <Transition name="run-start-dialog">
  <div
    v-if="open"
    class="run-start-dialog-backdrop"
    :class="{ 'run-start-dialog--stagger-guard': openingStaggerGuard }"
    :style="backdropStackStyle"
    role="presentation"
    @click.self="onCancel"
  >
    <div class="run-start-dialog-scrim" aria-hidden="true" />
    <div
      ref="dialogCardRef"
      class="run-start-dialog-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-start-dialog-title"
      @click.stop
    >
      <h2 id="run-start-dialog-title" class="run-start-dialog-title run-start-stagger-el">开始游戏</h2>

      <SegmentTabControl
        v-if="hasContinueTab"
        class="run-start-dialog-tabs run-start-stagger-el"
        :model-value="activeTab"
        :options="runStartTabOptions"
        variant="run-start"
        aria-label="开始方式"
        fill
        :haptic="false"
        @update:model-value="setRunStartTab"
      />

      <div class="run-start-dialog-body">
        <template v-if="!hasContinueTab">
          <div class="run-start-dialog-seed-row run-start-stagger-el">
            <label class="run-start-dialog-seed-label" for="run-start-seed-input">种子</label>
            <div class="run-start-dialog-seed-field">
              <input
                id="run-start-seed-input"
                v-model="seedDraft"
                type="text"
                class="run-start-dialog-seed-input"
                autocomplete="off"
                spellcheck="false"
                maxlength="8"
                placeholder="留空则随机"
                @input="onSeedInput"
              />
              <button
                type="button"
                class="run-start-dialog-seed-random"
                title="随机种子"
                aria-label="随机种子"
                @click="onRandomSeed"
              >
                <i class="ri-dice-line" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <div class="run-start-dialog-seed-row run-start-dialog-preset-row run-start-stagger-el">
            <span class="run-start-dialog-seed-label">预设</span>
            <RunStartPresetPicker
              v-model="presetDraft"
              :slot-career="slotCareer"
              :fresh-unlock-preset-ids="freshUnlockPresetIds"
            />
          </div>
          <div class="run-start-dialog-seed-row run-start-dialog-preset-row run-start-stagger-el">
            <span class="run-start-dialog-seed-label">难度</span>
            <RunStartDifficultyPicker
              v-model="difficultyDraft"
              :slot-career="slotCareer"
              :fresh-unlock-difficulty-indices="freshUnlockDifficultyIndices"
            />
          </div>
        </template>

        <div v-else class="run-start-dialog-panels">
          <div
            ref="newGamePanelRef"
            role="tabpanel"
            aria-label="新游戏"
            class="run-start-dialog-panel"
            :class="{ 'run-start-dialog-panel--active': activeTab === 'new' }"
            :aria-hidden="activeTab !== 'new'"
            :inert="activeTab !== 'new'"
          >
            <div class="run-start-dialog-seed-row run-start-stagger-el">
              <label class="run-start-dialog-seed-label" for="run-start-seed-input-tab">种子</label>
              <div class="run-start-dialog-seed-field">
                <input
                  id="run-start-seed-input-tab"
                  v-model="seedDraft"
                  type="text"
                  class="run-start-dialog-seed-input"
                  autocomplete="off"
                  spellcheck="false"
                  maxlength="8"
                  placeholder="留空则随机"
                  @input="onSeedInput"
                />
                <button
                  type="button"
                  class="run-start-dialog-seed-random"
                  title="随机种子"
                  aria-label="随机种子"
                  @click="onRandomSeed"
                >
                  <i class="ri-dice-line" aria-hidden="true"></i>
                </button>
              </div>
            </div>
            <div class="run-start-dialog-seed-row run-start-dialog-preset-row run-start-stagger-el">
              <span class="run-start-dialog-seed-label">预设</span>
              <RunStartPresetPicker
                v-model="presetDraft"
                :slot-career="slotCareer"
                :fresh-unlock-preset-ids="freshUnlockPresetIds"
              />
            </div>
            <div class="run-start-dialog-seed-row run-start-dialog-preset-row run-start-stagger-el">
              <span class="run-start-dialog-seed-label">难度</span>
              <RunStartDifficultyPicker
                v-model="difficultyDraft"
                :slot-career="slotCareer"
                :fresh-unlock-difficulty-indices="freshUnlockDifficultyIndices"
              />
            </div>
          </div>

          <div
            ref="continuePanelRef"
            role="tabpanel"
            aria-label="继续"
            class="run-start-dialog-panel"
            :class="{ 'run-start-dialog-panel--active': activeTab === 'continue' }"
            :aria-hidden="activeTab !== 'continue'"
            :inert="activeTab !== 'continue'"
          >
            <div class="run-start-dialog-seed-row run-start-stagger-el">
              <span class="run-start-dialog-seed-label">种子</span>
              <div
                class="run-start-dialog-seed-readonly"
                :title="continueSeedDisplay"
              >
                {{ continueSeedDisplay || "—" }}
              </div>
            </div>

            <div class="run-start-dialog-continue-meta-row run-start-stagger-el">
              <div class="run-start-dialog-continue-meta-cell">
                <span class="run-start-dialog-seed-label">预设</span>
                <div class="run-start-dialog-preset-readonly-card">
                  <div class="run-start-dialog-preset-readonly-head">
                    <span class="run-start-dialog-preset-emoji" aria-hidden="true">{{ continuePresetEmoji }}</span>
                    <span class="run-start-dialog-preset-name">{{ continuePresetName }}</span>
                  </div>
                  <div class="run-start-dialog-preset-readonly-desc">
                    <PresetDescRichText
                      :description="continuePresetDef.description"
                      :size="continuePresetDescLayoutTier"
                      @preview-voucher="onContinuePreviewVoucher"
                      @preview-wildcard="onContinuePreviewWildcard"
                    />
                  </div>
                </div>
              </div>

              <div class="run-start-dialog-continue-meta-cell run-start-dialog-continue-meta-cell--difficulty">
                <span class="run-start-dialog-seed-label">难度</span>
                <div class="run-start-dialog-difficulty-readonly-card">
                  <DifficultyPill
                    class="run-start-dialog-continue-difficulty-pill"
                    :index="continueDifficultyIndex"
                  />
                </div>
              </div>
            </div>

            <div class="run-start-dialog-progress run-start-stagger-el">
              <span class="run-start-dialog-seed-label">游戏进度</span>
              <div class="run-start-dialog-progress-grid">
                <div class="run-start-dialog-progress-cell">
                  <span class="run-start-dialog-progress-value">{{ continueLevelLabel }}</span>
                  <span class="run-start-dialog-progress-label">关卡</span>
                </div>
                <div class="run-start-dialog-progress-cell">
                  <span class="run-start-dialog-progress-value run-start-dialog-progress-value--money">
                    <span class="run-start-dialog-money-char">$</span>{{ continueMoney }}
                  </span>
                  <span class="run-start-dialog-progress-label">资金</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="run-start-dialog-footer confirm-actions-row">
        <button
          type="button"
          class="run-start-dialog-btn run-start-dialog-btn--primary run-start-stagger-el"
          :disabled="primaryButtonDisabled"
          @click="onConfirm($event)"
        >
          {{ primaryButtonLabel }}
        </button>
        <button type="button" class="run-start-dialog-btn run-start-dialog-btn--secondary run-start-stagger-el" @click="onCancel">
          取消
        </button>
      </div>
    </div>
  </div>
  </Transition>

  <TreasureDetailLayer
    v-if="continueVoucherDetail"
    :treasure="continueVoucherDetail"
    mode="offer"
    :show-shelf-price="false"
    :wallet-amount="0"
    @close="continueVoucherDetail = null"
  />

  <TileDetailLayer
    v-if="continueWildcardDetailOpen"
    :payload="continueWildcardDetailPayload"
    :origin-rect="continueWildcardDetailOriginRect"
    @close="closeContinueWildcardDetail"
  />
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { recordPointerClientFromEvent } from "../game/lastPointerClient.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent, triggerHaptic } from "../platform/haptics.js";
import { generateRandomRunSeedString, normalizeRunSeedInput, resolveRunSeedFromDialog } from "../game/runRng.js";
import { getPresetDescriptionLayoutTier, getRunPresetDef, normalizeRunPresetId } from "../game/runPresetDefinitions.js";
import { getLastSelectedPresetId } from "../game/runPresetProgress.js";
import { getLastSelectedDifficultyBrowseIndex } from "../game/runDifficultyProgress.js";
import {
  isRunStartDifficultySelectable,
  isRunStartPresetSelectable,
} from "../game/runStartSelectability.js";
import { normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";
import {
  killRunStartDialogEnterTweens,
  playRunStartDialogEnter,
  prepareRunStartDialogEnterHidden,
  resetRunStartPanelGsapProps,
} from "../game/runStartDialogEnterAnim.js";
import DifficultyPill from "./DifficultyPill.vue";
import RunStartDifficultyPicker from "./RunStartDifficultyPicker.vue";
import {
  resolveRunStartDifficultyDraft,
  resolveRunStartPresetDraft,
} from "../game/runStartFreshUnlock.js";
import { normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import PresetDescRichText from "./PresetDescRichText.vue";
import RunStartPresetPicker from "./RunStartPresetPicker.vue";
import TileDetailLayer from "./TileDetailLayer.vue";
import {
  WILDCARD_PRESET_TILE_DETAIL_PAYLOAD,
  wildcardPresetPreviewOriginRectFromEvent,
} from "../game/wildcardPresetPreview.js";
import TreasureDetailLayer from "./TreasureDetailLayer.vue";
import SegmentTabControl from "./SegmentTabControl.vue";

/** @typedef {{ seedDisplay: string, levelId: string, money: number, isEndlessRun?: boolean, presetId?: string, difficultyIndex?: number, continueEnabled?: boolean }} RunContinueSnapshot */

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 打开弹层时预填的种子（失败重开等） */
  initialSeed: { type: String, default: "" },
  /** 当前栏位未完成对局摘要；有值时显示「新游戏 / 继续」分 tab */
  continueSnapshot: { type: /** @type {import('vue').PropType<RunContinueSnapshot | null>} */ (Object), default: null },
  /** 当前存档槽 career（预设解锁） */
  slotCareer: { type: Object, default: null },
  /** 本局通关后新解锁的预设 id（会话内「新！」角标） */
  freshUnlockPresetIds: { type: Array, default: () => [] },
  /** 本局通关后新解锁的难度 index */
  freshUnlockDifficultyIndices: { type: Array, default: () => [] },
});

const emit = defineEmits(["confirm", "cancel"]);

const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

/** @type {import('vue').Ref<HTMLElement | null>} */
const dialogCardRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const newGamePanelRef = ref(null);
/** @type {import('vue').Ref<HTMLElement | null>} */
const continuePanelRef = ref(null);
const openingStaggerGuard = ref(true);
let skipTabSwitchAnim = false;
/** @type {ReturnType<typeof setTimeout> | null} */
let openEnterAnimTimer = null;

function collectActivePanelStaggerTargets() {
  if (!hasContinueTab.value) {
    const body = dialogCardRef.value?.querySelector(".run-start-dialog-body");
    return body ? [...body.querySelectorAll(".run-start-stagger-el")] : [];
  }
  const panel = activeTab.value === "new" ? newGamePanelRef.value : continuePanelRef.value;
  return panel ? [...panel.querySelectorAll(".run-start-stagger-el")] : [];
}

function collectFullOpenStaggerTargets() {
  const card = dialogCardRef.value;
  if (!card) return [];
  /** @type {HTMLElement[]} */
  const els = [];
  const title = card.querySelector(".run-start-dialog-title.run-start-stagger-el");
  if (title instanceof HTMLElement) els.push(title);
  const tabs = card.querySelector(".run-start-dialog-tabs.run-start-stagger-el");
  if (tabs instanceof HTMLElement) els.push(tabs);
  els.push(...collectActivePanelStaggerTargets());
  els.push(...card.querySelectorAll(".run-start-dialog-footer .run-start-stagger-el"));
  return els;
}

function killAllDialogStaggerTweens() {
  const card = dialogCardRef.value;
  if (!card) return;
  killRunStartDialogEnterTweens([...card.querySelectorAll(".run-start-stagger-el")]);
}

function runDialogOpenEnterAnim() {
  const targets = collectFullOpenStaggerTargets();
  prepareRunStartDialogEnterHidden(targets);
  openingStaggerGuard.value = false;
  playRunStartDialogEnter(targets);
}

function runActiveTabEnterAnim() {
  if (!props.open) return;
  const targets = collectActivePanelStaggerTargets();
  prepareRunStartDialogEnterHidden(targets);
  playRunStartDialogEnter(targets);
}

function applyDialogOpenState() {
  skipTabSwitchAnim = true;
  openingStaggerGuard.value = true;
  if (openEnterAnimTimer) {
    clearTimeout(openEnterAnimTimer);
    openEnterAnimTimer = null;
  }
  nextTick(() => {
    prepareRunStartDialogEnterHidden(collectFullOpenStaggerTargets());
    openEnterAnimTimer = setTimeout(() => {
      openEnterAnimTimer = null;
      runDialogOpenEnterAnim();
      skipTabSwitchAnim = false;
    }, 120);
  });
}

onBeforeUnmount(() => {
  if (openEnterAnimTimer) clearTimeout(openEnterAnimTimer);
  killAllDialogStaggerTweens();
});

watch(
  () => props.open,
  (v, prev) => {
    if (v) {
      nextTick(() => {
        stackZ.value = bumpOverlayZ();
      });
      scheduleOverlayPresent(280);
    } else if (prev) {
      scheduleOverlayDismiss(240);
    }
  },
  { immediate: true },
);

const seedDraft = ref("");
/** @type {import('vue').Ref<'new' | 'continue'>} */
const activeTab = ref("new");
const presetDraft = ref("preset_01");
const difficultyDraft = ref(0);

const normalizedCareer = computed(() => normalizeSlotCareerStats(props.slotCareer));

const hasContinueTab = computed(
  () => props.continueSnapshot != null && props.continueSnapshot.continueEnabled !== false,
);
const runStartTabOptions = computed(() => [
  { id: "new", label: "新游戏" },
  { id: "continue", label: "继续" },
]);
const continueSeedDisplay = computed(() => String(props.continueSnapshot?.seedDisplay ?? "").trim());
const continuePresetDef = computed(() =>
  getRunPresetDef(String(props.continueSnapshot?.presetId ?? "preset_01")),
);
const continuePresetEmoji = computed(() => continuePresetDef.value.emoji);
const continuePresetName = computed(() => continuePresetDef.value.name);
const continuePresetDescLayoutTier = computed(() => {
  const tier = getPresetDescriptionLayoutTier(continuePresetDef.value);
  return tier === "normal" ? "medium" : "compact";
});

/** @type {import('vue').Ref<object | null>} */
const continueVoucherDetail = ref(null);
const continueWildcardDetailOpen = ref(false);
/** @type {import('vue').Ref<{ left: number, top: number, width: number, height: number } | null>} */
const continueWildcardDetailOriginRect = ref(null);
const continueWildcardDetailPayload = WILDCARD_PRESET_TILE_DETAIL_PAYLOAD;

/** @param {{ detail: object }} payload */
function onContinuePreviewVoucher(payload) {
  continueVoucherDetail.value = payload.detail;
}

/** @param {{ event?: MouseEvent }} [payload] */
function onContinuePreviewWildcard(payload) {
  continueWildcardDetailOriginRect.value = wildcardPresetPreviewOriginRectFromEvent(payload?.event);
  continueWildcardDetailOpen.value = true;
}

function closeContinueWildcardDetail() {
  continueWildcardDetailOpen.value = false;
  continueWildcardDetailOriginRect.value = null;
}
const continueLevelLabel = computed(() => {
  const id = String(props.continueSnapshot?.levelId ?? "1-1");
  return props.continueSnapshot?.isEndlessRun ? `${id}（无尽）` : id;
});
const continueMoney = computed(() => Math.max(0, Math.floor(Number(props.continueSnapshot?.money) || 0)));
const continueDifficultyIndex = computed(() =>
  normalizeRunDifficultyIndex(props.continueSnapshot?.difficultyIndex ?? 0),
);
const presetLockedForNew = computed(
  () => !isRunStartPresetSelectable(presetDraft.value, normalizedCareer.value),
);
const difficultyLockedForNew = computed(
  () => !isRunStartDifficultySelectable(difficultyDraft.value, normalizedCareer.value),
);
const primaryButtonLabel = computed(() => {
  if (activeTab.value === "continue") return "继续游戏";
  if (presetLockedForNew.value) return "预设未解锁";
  if (difficultyLockedForNew.value) return "难度未解锁";
  return "开始游戏";
});
const primaryButtonDisabled = computed(
  () =>
    activeTab.value === "new" && (presetLockedForNew.value || difficultyLockedForNew.value),
);

watch(
  () => [
    props.open,
    props.initialSeed,
    props.continueSnapshot,
    props.slotCareer,
    props.freshUnlockPresetIds,
    props.freshUnlockDifficultyIndices,
  ],
  ([isOpen], oldTuple) => {
    const wasOpen = oldTuple?.[0] ?? false;
    if (!isOpen) {
      openingStaggerGuard.value = true;
      if (openEnterAnimTimer) {
        clearTimeout(openEnterAnimTimer);
        openEnterAnimTimer = null;
      }
      killAllDialogStaggerTweens();
      return;
    }
    seedDraft.value = props.initialSeed ? normalizeRunSeedInput(String(props.initialSeed)) : "";
    activeTab.value = hasContinueTab.value ? "continue" : "new";
    const career = normalizedCareer.value;
    presetDraft.value = resolveRunStartPresetDraft(
      getLastSelectedPresetId(career),
      props.freshUnlockPresetIds,
      career,
    );
    difficultyDraft.value = resolveRunStartDifficultyDraft(
      getLastSelectedDifficultyBrowseIndex(career),
      props.freshUnlockDifficultyIndices,
      career,
    );
    if (!wasOpen) {
      applyDialogOpenState();
    }
  },
);

watch(activeTab, () => {
  if (!props.open || skipTabSwitchAnim || !hasContinueTab.value) return;
  killAllDialogStaggerTweens();
  const inactivePanel = activeTab.value === "new" ? continuePanelRef.value : newGamePanelRef.value;
  resetRunStartPanelGsapProps(inactivePanel);
  nextTick(() => runActiveTabEnterAnim());
});

function onSeedInput() {
  seedDraft.value = normalizeRunSeedInput(seedDraft.value);
}

function onRandomSeed() {
  seedDraft.value = generateRandomRunSeedString();
}

/** @param {'new' | 'continue'} tab */
function setRunStartTab(tab) {
  if (activeTab.value === tab) return;
  triggerHaptic("tabSwitch");
  activeTab.value = tab;
}

/** @param {MouseEvent} event */
function onConfirm(event) {
  recordPointerClientFromEvent(event);
  if (activeTab.value === "continue" && hasContinueTab.value) {
    emit("confirm", { mode: "continue" });
    return;
  }
  if (!isRunStartPresetSelectable(presetDraft.value, normalizedCareer.value)) return;
  if (!isRunStartDifficultySelectable(difficultyDraft.value, normalizedCareer.value)) return;
  const { seedNumeric, seedDisplay } = resolveRunSeedFromDialog(seedDraft.value);
  emit("confirm", {
    mode: "new",
    seedNumeric,
    seedDisplay,
    presetId: normalizeRunPresetId(presetDraft.value),
    difficultyIndex: normalizeRunDifficultyIndex(difficultyDraft.value),
  });
}

function onCancel() {
  emit("cancel");
}
</script>

<style scoped>
.run-start-dialog-backdrop {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx));
  box-sizing: border-box;
  overflow: visible;
}

.run-start-dialog-scrim {
  /* 偏蓝深灰，与选项/结算层同色阶透明度（约 0.88） */
  background: rgba(48, 62, 78, 0.88);
  pointer-events: none;
}

.run-start-dialog-card {
  position: relative;
  z-index: 1;
  width: min(100%, calc(600 * var(--rpx)));
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--card-bright, #faf8ef);
  border-radius: calc(12 * var(--rpx));
  box-shadow: var(--shadow);
  padding: calc(28 * var(--rpx)) calc(24 * var(--rpx)) calc(22 * var(--rpx));
  box-sizing: border-box;
  transform-origin: center bottom;
}

.run-start-stagger-el {
  will-change: transform, opacity;
}

.run-start-dialog-enter-active .run-start-stagger-el,
.run-start-dialog--stagger-guard .run-start-stagger-el {
  opacity: 0;
}

.run-start-dialog-enter-active {
  transition: opacity 0.5s step-end;
}

.run-start-dialog-leave-active {
  transition: opacity 0.24s step-end;
}

.run-start-dialog-enter-from,
.run-start-dialog-enter-to,
.run-start-dialog-leave-from,
.run-start-dialog-leave-to {
  opacity: 1;
}

.run-start-dialog-enter-active .run-start-dialog-scrim {
  animation: run-start-dialog-scrim-in 0.26s var(--ease-expo-out, ease-out) both;
}

/* 回正段勿用 both：延迟时 backwards 会在 0s 套用 -5%，盖住上升段 30%→-5% */
.run-start-dialog-enter-active .run-start-dialog-card {
  animation:
    run-start-dialog-card-rise 0.2s var(--ease-circ-out) both,
    run-start-dialog-card-settle 0.3s var(--ease-circ-in-out) 0.2s forwards;
}

.run-start-dialog-leave-active .run-start-dialog-scrim {
  transition: opacity 0.22s var(--ease-expo-out, ease-out);
}

.run-start-dialog-leave-active .run-start-dialog-card {
  transition:
    opacity 0.18s ease-out,
    transform 0.18s ease-out;
}

.run-start-dialog-leave-to .run-start-dialog-scrim {
  opacity: 0;
}

.run-start-dialog-leave-to .run-start-dialog-card {
  opacity: 0;
  transform: translateY(calc(16 * var(--rpx)));
}

@keyframes run-start-dialog-scrim-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes run-start-dialog-card-rise {
  from {
    opacity: 1;
    transform: translateY(30%);
  }
  to {
    opacity: 1;
    transform: translateY(-5%);
  }
}

@keyframes run-start-dialog-card-settle {
  from {
    transform: translateY(-5%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.run-start-dialog-title {
  margin: 0 0 calc(22 * var(--rpx));
  font-size: calc(34 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.run-start-dialog-tabs {
  margin: calc(-6 * var(--rpx)) 0 calc(18 * var(--rpx));
  width: 100%;
  max-width: none;
}

.run-start-dialog-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.run-start-dialog-panels {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  width: 100%;
  min-width: 0;
}

.run-start-dialog-panel {
  grid-area: 1 / 1;
  width: 100%;
  min-width: 0;
  visibility: hidden;
  pointer-events: none;
}

.run-start-dialog-panel--active {
  visibility: visible;
  pointer-events: auto;
}

.run-start-dialog-seed-row {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
  min-width: 0;
}

.run-start-dialog-preset-row {
  margin-top: calc(10 * var(--rpx));
}

.run-start-dialog-seed-label {
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
}

.run-start-dialog-seed-field {
  display: flex;
  align-items: stretch;
  gap: calc(8 * var(--rpx));
}

.run-start-dialog-seed-input {
  flex: 1;
  min-width: 0;
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.08);
  border-radius: var(--radius);
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-dark, #3c3a32);
  background: var(--card, #eee4da);
  box-sizing: border-box;
}

.run-start-dialog-seed-input::placeholder {
  font-weight: 500;
  letter-spacing: normal;
}

.run-start-dialog-seed-readonly {
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.06);
  border-radius: var(--radius);
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--text-dark, #3c3a32);
  background: rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.run-start-dialog-progress {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
  margin-top: calc(10 * var(--rpx));
}

.run-start-dialog-progress-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: calc(10 * var(--rpx));
}

.run-start-dialog-progress-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(4 * var(--rpx));
  padding: calc(12 * var(--rpx)) calc(10 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card, #eee4da);
}

.run-start-dialog-progress-value {
  font-size: calc(26 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
  line-height: 1.2;
}

.run-start-dialog-progress-value--money {
  display: inline-flex;
  align-items: baseline;
  gap: calc(2 * var(--rpx));
  color: var(--money-gold, #b8860b);
}

.run-start-dialog-money-char {
  font-size: calc(22 * var(--rpx));
  font-weight: 800;
  color: var(--money-gold, #b8860b);
  opacity: 1;
}

.run-start-dialog-progress-label {
  font-size: calc(20 * var(--rpx));
  font-weight: 700;
  color: rgba(60, 58, 50, 0.62);
}

.run-start-dialog-continue-meta-row {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: calc(10 * var(--rpx));
  margin-top: calc(10 * var(--rpx));
}

.run-start-dialog-continue-meta-cell {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
  min-width: 0;
}

.run-start-dialog-difficulty-readonly-card {
  flex: 1 1 auto;
  min-width: 0;
  min-height: calc(152 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card, #eee4da);
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.run-start-dialog-continue-difficulty-pill :deep(.difficulty-pill) {
  font-size: calc(22 * var(--rpx));
  padding: calc(6 * var(--rpx)) calc(16 * var(--rpx));
}

.run-start-dialog-preset-readonly-card {
  height: calc(152 * var(--rpx));
  min-height: calc(152 * var(--rpx));
  max-height: calc(152 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card, #eee4da);
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
}

.run-start-dialog-preset-readonly-head {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: calc(6 * var(--rpx));
  flex-shrink: 0;
  max-width: 100%;
  line-height: 1.2;
}

.run-start-dialog-preset-emoji {
  font-size: calc(28 * var(--rpx));
  line-height: 1;
}

.run-start-dialog-preset-name {
  font-size: calc(24 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  line-height: 1.2;
}

.run-start-dialog-preset-readonly-desc {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  max-height: calc(98 * var(--rpx));
  overflow: hidden;
  margin-top: calc(8 * var(--rpx));
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-rich-text) {
  font-size: calc(24 * var(--rpx));
  line-height: 1.4;
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-rich-text--medium) {
  font-size: calc(22 * var(--rpx));
  line-height: 1.38;
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-rich-text--compact) {
  font-size: calc(20 * var(--rpx));
  line-height: 1.34;
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-chip) {
  font-size: calc(18 * var(--rpx));
  padding: calc(1 * var(--rpx)) calc(6 * var(--rpx));
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-rich-text--compact .preset-desc-chip) {
  font-size: calc(16 * var(--rpx));
}

.run-start-dialog-seed-random {
  flex-shrink: 0;
  width: calc(52 * var(--rpx));
  border: none;
  border-radius: var(--radius);
  background: #d4954a;
  color: #f9f6f2;
  font-size: calc(28 * var(--rpx));
  cursor: pointer;
  box-shadow: var(--shadow);
  display: flex;
  align-items: center;
  justify-content: center;
}

.run-start-dialog-seed-random:hover {
  filter: brightness(1.05);
}

.run-start-dialog-seed-random:active {
  filter: brightness(0.92);
}

.run-start-dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: calc(12 * var(--rpx));
  margin-top: calc(26 * var(--rpx));
}

.run-start-dialog-btn {
  flex: 1;
  border: none;
  border-radius: var(--radius);
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx));
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
}

.run-start-dialog-btn--primary {
  background: #5a8fb8;
  color: #f9f6f2;
}

.run-start-dialog-btn--primary:disabled {
  background: rgba(90, 143, 184, 0.45);
  color: rgba(249, 246, 242, 0.88);
  cursor: not-allowed;
  filter: none;
}

.run-start-dialog-btn--primary:disabled:hover {
  filter: none;
}

.run-start-dialog-btn--secondary {
  background: var(--card, #eee4da);
  color: var(--text-dark, #3c3a32);
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.1);
  box-shadow: none;
}

.run-start-dialog-btn:hover {
  filter: brightness(1.05);
}

.run-start-dialog-btn:active {
  filter: brightness(0.92);
}
</style>
