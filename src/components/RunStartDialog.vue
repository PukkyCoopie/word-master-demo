<template>
  <Transition name="run-start-dialog">
  <div
    v-if="open"
    class="run-start-dialog-backdrop"
    :style="backdropStackStyle"
    role="presentation"
    @click.self="onCancel"
  >
    <div class="run-start-dialog-scrim" aria-hidden="true" />
    <div
      class="run-start-dialog-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="run-start-dialog-title"
      @click.stop
    >
      <h2 id="run-start-dialog-title" class="run-start-dialog-title">开始游戏</h2>

      <div
        v-if="hasContinueTab"
        class="run-start-dialog-tabs"
        role="tablist"
        aria-label="开始方式"
      >
        <button
          type="button"
          role="tab"
          class="run-start-dialog-tab"
          :class="{ 'run-start-dialog-tab--active': activeTab === 'new' }"
          :aria-selected="activeTab === 'new'"
          @click="activeTab = 'new'"
        >
          新游戏
        </button>
        <button
          type="button"
          role="tab"
          class="run-start-dialog-tab"
          :class="{ 'run-start-dialog-tab--active': activeTab === 'continue' }"
          :aria-selected="activeTab === 'continue'"
          @click="activeTab = 'continue'"
        >
          继续
        </button>
      </div>

      <div class="run-start-dialog-body">
        <template v-if="!hasContinueTab">
          <div class="run-start-dialog-seed-row">
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
          <div class="run-start-dialog-seed-row run-start-dialog-preset-row">
            <span class="run-start-dialog-seed-label">预设</span>
            <RunStartPresetPicker
              v-model="presetDraft"
              :slot-career="slotCareer"
            />
          </div>
        </template>

        <div v-else class="run-start-dialog-panels">
          <div
            role="tabpanel"
            aria-label="新游戏"
            class="run-start-dialog-panel"
            :class="{ 'run-start-dialog-panel--active': activeTab === 'new' }"
            :aria-hidden="activeTab !== 'new'"
            :inert="activeTab !== 'new'"
          >
            <div class="run-start-dialog-seed-row">
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
            <div class="run-start-dialog-seed-row run-start-dialog-preset-row">
              <span class="run-start-dialog-seed-label">预设</span>
              <RunStartPresetPicker
                v-model="presetDraft"
                :slot-career="slotCareer"
              />
            </div>
          </div>

          <div
            role="tabpanel"
            aria-label="继续"
            class="run-start-dialog-panel"
            :class="{ 'run-start-dialog-panel--active': activeTab === 'continue' }"
            :aria-hidden="activeTab !== 'continue'"
            :inert="activeTab !== 'continue'"
          >
            <div class="run-start-dialog-seed-row">
              <span class="run-start-dialog-seed-label">种子</span>
              <div
                class="run-start-dialog-seed-readonly"
                :title="continueSeedDisplay"
              >
                {{ continueSeedDisplay || "—" }}
              </div>
            </div>

            <div class="run-start-dialog-seed-row run-start-dialog-preset-row">
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

            <div class="run-start-dialog-progress">
              <span class="run-start-dialog-seed-label">对局进度</span>
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

      <div class="run-start-dialog-footer">
        <button
          type="button"
          class="run-start-dialog-btn run-start-dialog-btn--primary"
          :disabled="primaryButtonDisabled"
          @click="onConfirm($event)"
        >
          {{ primaryButtonLabel }}
        </button>
        <button type="button" class="run-start-dialog-btn run-start-dialog-btn--secondary" @click="onCancel">
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
    :wallet-amount="0"
    @close="continueVoucherDetail = null"
  />

  <TileDetailLayer
    v-if="continueWildcardDetailOpen"
    :payload="continueWildcardDetailPayload"
    @close="continueWildcardDetailOpen = false"
  />
</template>

<script setup>
import { computed, nextTick, ref, watch } from "vue";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { recordPointerClientFromEvent } from "../game/lastPointerClient.js";
import { generateRandomRunSeedString, normalizeRunSeedInput, resolveRunSeedFromDialog } from "../game/runRng.js";
import { getPresetDescriptionLayoutTier, getRunPresetDef, normalizeRunPresetId } from "../game/runPresetDefinitions.js";
import { getLastSelectedPresetId, isPresetUnlocked } from "../game/runPresetProgress.js";
import { normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import PresetDescRichText from "./PresetDescRichText.vue";
import RunStartPresetPicker from "./RunStartPresetPicker.vue";
import TileDetailLayer from "./TileDetailLayer.vue";
import TreasureDetailLayer from "./TreasureDetailLayer.vue";

/** @typedef {{ seedDisplay: string, levelId: string, money: number, isEndlessRun?: boolean, presetId?: string }} RunContinueSnapshot */

const props = defineProps({
  open: { type: Boolean, default: false },
  /** 打开弹层时预填的种子（失败重开等） */
  initialSeed: { type: String, default: "" },
  /** 当前栏位未完成对局摘要；有值时显示「新游戏 / 继续」分 tab */
  continueSnapshot: { type: /** @type {import('vue').PropType<RunContinueSnapshot | null>} */ (Object), default: null },
  /** 当前存档槽 career（预设解锁） */
  slotCareer: { type: Object, default: null },
});

const emit = defineEmits(["confirm", "cancel"]);

const stackZ = ref(0);
const backdropStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

watch(
  () => props.open,
  (v) => {
    if (v) {
      nextTick(() => {
        stackZ.value = bumpOverlayZ();
      });
    }
  },
  { immediate: true },
);

const seedDraft = ref("");
/** @type {import('vue').Ref<'new' | 'continue'>} */
const activeTab = ref("new");
const presetDraft = ref("preset_01");

const normalizedCareer = computed(() => normalizeSlotCareerStats(props.slotCareer));

const hasContinueTab = computed(() => props.continueSnapshot != null);
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
const continueWildcardDetailPayload = {
  letter: "?",
  rarity: "common",
  materialId: "wildcard",
  accessoryId: null,
  treasureAccessoryId: null,
  tileScoreBonus: 0,
  tileMultBonus: 0,
  hideRarityGem: true,
};

/** @param {{ detail: object }} payload */
function onContinuePreviewVoucher(payload) {
  continueVoucherDetail.value = payload.detail;
}

function onContinuePreviewWildcard() {
  continueWildcardDetailOpen.value = true;
}
const continueLevelLabel = computed(() => {
  const id = String(props.continueSnapshot?.levelId ?? "1-1");
  return props.continueSnapshot?.isEndlessRun ? `${id}（无尽）` : id;
});
const continueMoney = computed(() => Math.max(0, Math.floor(Number(props.continueSnapshot?.money) || 0)));
const presetLockedForNew = computed(() => !isPresetUnlocked(presetDraft.value, normalizedCareer.value));
const primaryButtonLabel = computed(() => {
  if (activeTab.value === "continue") return "继续游戏";
  return presetLockedForNew.value ? "预设未解锁" : "开始游戏";
});
const primaryButtonDisabled = computed(() => activeTab.value === "new" && presetLockedForNew.value);

watch(
  () => [props.open, props.initialSeed, props.continueSnapshot, props.slotCareer],
  ([isOpen]) => {
    if (!isOpen) return;
    seedDraft.value = props.initialSeed ? normalizeRunSeedInput(String(props.initialSeed)) : "";
    activeTab.value = props.continueSnapshot != null ? "continue" : "new";
    presetDraft.value = getLastSelectedPresetId(normalizedCareer.value);
  },
);

function onSeedInput() {
  seedDraft.value = normalizeRunSeedInput(seedDraft.value);
}

function onRandomSeed() {
  seedDraft.value = generateRandomRunSeedString();
}

/** @param {MouseEvent} event */
function onConfirm(event) {
  recordPointerClientFromEvent(event);
  if (activeTab.value === "continue" && hasContinueTab.value) {
    emit("confirm", { mode: "continue" });
    return;
  }
  if (!isPresetUnlocked(presetDraft.value, normalizedCareer.value)) return;
  const { seedNumeric, seedDisplay } = resolveRunSeedFromDialog(seedDraft.value);
  emit("confirm", {
    mode: "new",
    seedNumeric,
    seedDisplay,
    presetId: normalizeRunPresetId(presetDraft.value),
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
  width: min(100%, calc(520 * var(--rpx)));
  background: var(--card-bright, #faf8ef);
  border-radius: calc(12 * var(--rpx));
  box-shadow: var(--shadow);
  padding: calc(28 * var(--rpx)) calc(24 * var(--rpx)) calc(22 * var(--rpx));
  box-sizing: border-box;
  transform-origin: center bottom;
}

.run-start-dialog-enter-active {
  transition: opacity 0.42s step-end;
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
    run-start-dialog-card-settle 0.22s var(--ease-circ-in) 0.2s forwards;
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
  display: flex;
  gap: calc(8 * var(--rpx));
  margin: calc(-6 * var(--rpx)) 0 calc(18 * var(--rpx));
  padding: calc(4 * var(--rpx));
  border-radius: var(--radius);
  background: var(--card, #eee4da);
}

.run-start-dialog-tab {
  flex: 1;
  border: none;
  border-radius: calc(8 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(12 * var(--rpx));
  font-family: inherit;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
  background: transparent;
  cursor: pointer;
  opacity: 0.72;
}

.run-start-dialog-tab--active {
  background: var(--card-bright, #faf8ef);
  box-shadow: var(--shadow);
  opacity: 1;
}

.run-start-dialog-body {
  display: flex;
  flex-direction: column;
}

.run-start-dialog-panels {
  display: grid;
}

.run-start-dialog-panel {
  grid-area: 1 / 1;
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
  opacity: 0.55;
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
}

.run-start-dialog-money-char {
  font-size: calc(22 * var(--rpx));
  font-weight: 800;
  opacity: 0.85;
}

.run-start-dialog-progress-label {
  font-size: calc(20 * var(--rpx));
  font-weight: 700;
  color: rgba(60, 58, 50, 0.62);
}

.run-start-dialog-preset-readonly-card {
  height: calc(142 * var(--rpx));
  min-height: calc(142 * var(--rpx));
  max-height: calc(142 * var(--rpx));
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
  max-height: calc(88 * var(--rpx));
  overflow: hidden;
  margin-top: calc(8 * var(--rpx));
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-rich-text) {
  font-size: calc(22 * var(--rpx));
  line-height: 1.4;
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-rich-text--medium) {
  font-size: calc(20 * var(--rpx));
  line-height: 1.38;
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-rich-text--compact) {
  font-size: calc(18 * var(--rpx));
  line-height: 1.34;
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-chip) {
  font-size: calc(17 * var(--rpx));
  padding: calc(1 * var(--rpx)) calc(6 * var(--rpx));
}

.run-start-dialog-preset-readonly-desc :deep(.preset-desc-rich-text--compact .preset-desc-chip) {
  font-size: calc(15 * var(--rpx));
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
