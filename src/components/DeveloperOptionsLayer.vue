<template>
  <Transition name="developer-options-layer" :css="true">
    <div
      v-if="open"
      class="developer-options-layer portal-overlay-fill"
      :style="portalStackStyle"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @click.self="onBackdropSelfClick"
    >
      <div class="developer-options-card" @click.stop>
        <h2 :id="titleId" class="developer-options-title">开发者选项</h2>

        <div class="developer-options-body">
          <section class="developer-options-section">
            <h3 class="developer-options-section-title">转换</h3>
            <p class="developer-options-hint">
              将牌库中
              <select v-model="convertScope" class="developer-options-select" aria-label="转换范围">
                <option v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              字母块{{ convertTargetActionLabel }}
              <select v-model="convertTarget" class="developer-options-select" aria-label="转换或佩戴目标">
                <optgroup label="材质">
                  <option v-for="opt in materialTargetOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </optgroup>
                <optgroup label="配饰">
                  <option v-for="opt in accessoryTargetOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </optgroup>
              </select>
            </p>
            <button type="button" class="developer-options-btn" @click="onConvertClick">
              {{ convertActionButtonLabel }}
            </button>
            <p v-if="convertResultText" class="developer-options-result">{{ convertResultText }}</p>
          </section>

          <section class="developer-options-section">
            <h3 class="developer-options-section-title">跳关</h3>
            <div class="developer-options-row">
              <input
                v-model.trim="levelInput"
                class="developer-options-input"
                type="text"
                inputmode="text"
                placeholder="如 3-2 或 levelIndex"
                aria-label="关卡 id 或 levelIndex"
                @keydown.enter.prevent="onJumpClick"
              />
              <button type="button" class="developer-options-btn" @click="onJumpClick">跳转</button>
            </div>
            <div class="developer-options-row developer-options-row--boss-shop">
              <div ref="bossSelectRootRef" class="developer-options-boss-select">
                <button
                  type="button"
                  class="developer-options-boss-select-trigger"
                  aria-haspopup="listbox"
                  :aria-expanded="bossSelectOpen"
                  aria-label="Boss"
                  @click="bossSelectOpen = !bossSelectOpen"
                >
                  <span class="developer-options-boss-select-copy">
                    <span class="developer-options-boss-select-name">{{ selectedBossOption?.label }}</span>
                    <span v-if="selectedBossOption?.description" class="developer-options-boss-select-desc">
                      {{ selectedBossOption.description }}
                    </span>
                  </span>
                  <i
                    class="ri-arrow-down-s-line developer-options-boss-select-chevron"
                    :class="{ 'developer-options-boss-select-chevron--open': bossSelectOpen }"
                    aria-hidden="true"
                  />
                </button>
                <ul
                  v-if="bossSelectOpen"
                  class="developer-options-boss-select-menu"
                  role="listbox"
                  aria-label="Boss 列表"
                >
                  <li
                    v-for="opt in bossJumpOptions"
                    :key="opt.value"
                    role="option"
                    :aria-selected="opt.value === bossJumpSlug"
                    class="developer-options-boss-select-option"
                    :class="{ 'developer-options-boss-select-option--active': opt.value === bossJumpSlug }"
                    @click="onBossOptionPick(opt.value)"
                  >
                    <span class="developer-options-boss-select-name">{{ opt.label }}</span>
                    <span v-if="opt.description" class="developer-options-boss-select-desc">{{ opt.description }}</span>
                  </li>
                </ul>
              </div>
              <button type="button" class="developer-options-btn" @click="onBossShopJumpClick">
                Boss 前商店
              </button>
            </div>
            <p class="developer-options-hint developer-options-hint--compact">
              Boss 前商店：上方输入框填章号（如 2、8）或关卡 id，留空为第 1 章；离店后进入对应 Boss 关。
            </p>
            <p v-if="bossShopJumpResultText" class="developer-options-result">{{ bossShopJumpResultText }}</p>
          </section>

          <section class="developer-options-section">
            <h3 class="developer-options-section-title">设置余额</h3>
            <p class="developer-options-hint developer-options-hint--compact">
              当前 {{ formatBalanceLabel(currentBalance) }}
            </p>
            <div class="developer-options-row">
              <input
                v-model.trim="balanceInput"
                class="developer-options-input"
                type="text"
                inputmode="numeric"
                placeholder="如 100 或 -5"
                aria-label="目标余额"
                @keydown.enter.prevent="onSetBalanceClick"
              />
              <button type="button" class="developer-options-btn" @click="onSetBalanceClick">应用</button>
            </div>
            <p v-if="balanceResultText" class="developer-options-result">{{ balanceResultText }}</p>
          </section>

          <section class="developer-options-section">
            <h3 class="developer-options-section-title">获取宝藏</h3>
            <button type="button" class="developer-options-btn" @click="openTreasurePicker">
              选择宝藏…
            </button>
            <p v-if="grantResultText" class="developer-options-result">{{ grantResultText }}</p>
          </section>
        </div>

        <button type="button" class="developer-options-close" @click="$emit('close')">关闭</button>
      </div>

      <div
        v-if="showTreasurePicker"
        class="developer-treasure-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="developer-treasure-picker-title"
        @click.self="closeTreasurePicker"
      >
        <div class="developer-treasure-picker-card" @click.stop>
          <h3 id="developer-treasure-picker-title" class="developer-treasure-picker-title">
            <span class="developer-treasure-picker-title-main">选择宝藏</span>
            <span v-if="totalSelectedCount > 0" class="developer-treasure-picker-title-count">
              已选 {{ totalSelectedCount }}
            </span>
          </h3>
          <p class="developer-treasure-picker-hint">点击格子累加数量，同一宝藏可多次点击</p>
          <div class="developer-treasure-picker-grid-stage">
            <div class="developer-treasure-picker-grid" role="list">
              <button
                v-for="item in treasurePickerPageItems"
                :key="item.treasureId"
                type="button"
                class="developer-treasure-picker-cell"
                :class="{ 'developer-treasure-picker-cell--picked': pickCount(item.treasureId) > 0 }"
                role="listitem"
                :aria-label="`${item.name}，已选 ${pickCount(item.treasureId)} 个`"
                @click="onTreasureCellClick(item.treasureId)"
              >
                <TreasureSlot
                  :treasure="treasureSlotPreview(item)"
                  :gem-class="gemClassForRarity(item.rarity)"
                />
                <span
                  v-if="pickCount(item.treasureId) > 0"
                  class="developer-treasure-picker-count"
                  aria-hidden="true"
                >
                  ×{{ pickCount(item.treasureId) }}
                </span>
              </button>
            </div>
          </div>
          <nav
            v-if="treasurePickerPageCount > 1"
            class="developer-treasure-picker-pager"
            aria-label="宝藏列表翻页"
          >
            <button
              type="button"
              class="developer-treasure-picker-pager-btn"
              :disabled="treasurePickerPage <= 0"
              aria-label="上一页"
              @click="stepTreasurePickerPage(-1)"
            >
              上一页
            </button>
            <span class="developer-treasure-picker-pager-label" aria-live="polite">
              {{ treasurePickerPage + 1 }} / {{ treasurePickerPageCount }}
            </span>
            <button
              type="button"
              class="developer-treasure-picker-pager-btn"
              :disabled="treasurePickerPage >= treasurePickerPageCount - 1"
              aria-label="下一页"
              @click="stepTreasurePickerPage(1)"
            >
              下一页
            </button>
          </nav>
          <div class="developer-treasure-picker-actions confirm-actions-row">
            <button
              type="button"
              class="developer-options-btn developer-options-btn--confirm"
              :disabled="totalSelectedCount === 0"
              @click="onGrantTreasuresConfirm"
            >
              确定加入（{{ totalSelectedCount }}）
            </button>
            <button
              type="button"
              class="developer-options-btn developer-options-btn--secondary"
              :disabled="totalSelectedCount === 0"
              @click="clearTreasureSelection"
            >
              清空
            </button>
            <button type="button" class="developer-options-btn developer-options-btn--secondary" @click="closeTreasurePicker">
              取消
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from "vue";
import { createBackdropSelfCloseGuard } from "../game/backdropSelfCloseGuard.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent } from "../platform/haptics.js";
import {
  buildDevDeckConvertScopeOptions,
  buildDevDeckConvertTargetOptionGroups,
  DEV_DECK_CONVERT_TARGET_PLAIN,
  getDevDeckConvertAccessoryTargetLabel,
  isDevDeckConvertAccessoryTarget,
} from "../dev/devDeckTileConvert.js";
import { buildDevBossJumpSelectOptions } from "../dev/devBossShopJump.js";
import TreasureSlot from "./TreasureSlot.vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  portalStackStyle: { type: Object, default: () => ({}) },
  currentBalance: { type: Number, default: 0 },
  /** @type {{ treasureId: string, name: string, emoji: string, rarity?: string }[]} */
  treasureItems: { type: Array, default: () => [] },
});

const emit = defineEmits([
  "close",
  "convert-deck",
  "jump-level",
  "jump-boss-shop",
  "grant-treasures",
  "set-balance",
]);

/** 6×5 翻页，避免手机端在弹窗内纵向滚动 */
const TREASURE_PICKER_COLS = 6;
const TREASURE_PICKER_ROWS = 5;
const TREASURE_PICKER_PAGE_SIZE = TREASURE_PICKER_COLS * TREASURE_PICKER_ROWS;

const titleId = "developer-options-title";
const backdropSelfCloseGuard = createBackdropSelfCloseGuard();

const scopeOptions = buildDevDeckConvertScopeOptions();
const convertTargetGroups = buildDevDeckConvertTargetOptionGroups();
const materialTargetOptions = convertTargetGroups.materials;
const accessoryTargetOptions = convertTargetGroups.accessories;

const convertScope = ref("all");
const convertTarget = ref("wildcard");

const convertTargetActionLabel = computed(() =>
  isDevDeckConvertAccessoryTarget(convertTarget.value) ? "佩戴" : "转换成",
);

const convertActionButtonLabel = computed(() =>
  isDevDeckConvertAccessoryTarget(convertTarget.value) ? "执行佩戴" : "执行转换",
);
const convertResultText = ref("");
const levelInput = ref("");
const grantResultText = ref("");
const bossJumpOptions = buildDevBossJumpSelectOptions();
const bossJumpSlug = ref(bossJumpOptions[0]?.value ?? "");
const bossShopJumpResultText = ref("");
const bossSelectRootRef = ref(null);
const bossSelectOpen = ref(false);

const selectedBossOption = computed(
  () => bossJumpOptions.find((o) => o.value === bossJumpSlug.value) ?? bossJumpOptions[0] ?? null,
);

/** @param {string} value */
function onBossOptionPick(value) {
  bossJumpSlug.value = value;
  bossSelectOpen.value = false;
}

/** @param {Event} e */
function onBossSelectOutsideClick(e) {
  if (!bossSelectOpen.value) return;
  const root = bossSelectRootRef.value;
  const target = e.target;
  if (root instanceof HTMLElement && target instanceof Node && !root.contains(target)) {
    bossSelectOpen.value = false;
  }
}

watch(bossSelectOpen, (open) => {
  if (open) {
    document.addEventListener("pointerdown", onBossSelectOutsideClick, true);
  } else {
    document.removeEventListener("pointerdown", onBossSelectOutsideClick, true);
  }
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", onBossSelectOutsideClick, true);
});
const balanceInput = ref("");
const balanceResultText = ref("");

const showTreasurePicker = ref(false);
const treasurePickerPage = ref(0);
const selectedTreasureCounts = ref(/** @type {Record<string, number>} */ ({}));

const treasurePickerPageCount = computed(() =>
  Math.max(1, Math.ceil(props.treasureItems.length / TREASURE_PICKER_PAGE_SIZE)),
);

const treasurePickerPageItems = computed(() => {
  const page = Math.min(
    Math.max(0, treasurePickerPage.value),
    treasurePickerPageCount.value - 1,
  );
  const start = page * TREASURE_PICKER_PAGE_SIZE;
  return props.treasureItems.slice(start, start + TREASURE_PICKER_PAGE_SIZE);
});

const totalSelectedCount = computed(() =>
  Object.values(selectedTreasureCounts.value).reduce(
    (sum, n) => sum + Math.max(0, Math.floor(Number(n) || 0)),
    0,
  ),
);

/** @param {string} treasureId */
function pickCount(treasureId) {
  return Math.max(0, Math.floor(Number(selectedTreasureCounts.value[treasureId]) || 0));
}

/** @param {{ treasureId: string, name: string, emoji: string }} item */
function treasureSlotPreview(item) {
  return {
    treasureId: item.treasureId,
    name: item.name,
    emoji: item.emoji,
  };
}

/** @param {string | undefined} rarity */
function gemClassForRarity(rarity) {
  if (rarity === "epic") return "gem-epic";
  if (rarity === "legendary") return "gem-legendary";
  if (rarity === "common") return "gem-common";
  return "gem-rare";
}

watch(
  () => props.open,
  (isOpen, wasOpen) => {
    if (isOpen) {
      backdropSelfCloseGuard.arm();
      scheduleOverlayPresent(280);
      convertResultText.value = "";
      grantResultText.value = "";
      bossShopJumpResultText.value = "";
      balanceResultText.value = "";
      balanceInput.value = String(Math.floor(Number(props.currentBalance) || 0));
      levelInput.value = "";
    } else if (wasOpen) {
      scheduleOverlayDismiss(240);
      showTreasurePicker.value = false;
      selectedTreasureCounts.value = {};
      bossSelectOpen.value = false;
    }
  },
);

function onBackdropSelfClick() {
  if (showTreasurePicker.value) {
    closeTreasurePicker();
    return;
  }
  backdropSelfCloseGuard.onBackdropSelfClick(() => emit("close"));
}

function onConvertClick() {
  convertResultText.value = "";
  emit("convert-deck", {
    scope: convertScope.value,
    target: convertTarget.value,
  });
}

/** @param {{ converted: number, eligible: number, accessoryMode?: boolean, accessoryId?: string | null, target?: string }} result */
function reportConvertResult(result) {
  if (!result?.converted) {
    convertResultText.value =
      result?.eligible > 0 ? "未选中任何牌张。" : "牌库中没有符合条件的字母块。";
    return;
  }
  if (result.accessoryMode) {
    const isClear = result.accessoryId == null;
    const targetLabel = isClear
      ? "无配饰"
      : getDevDeckConvertAccessoryTargetLabel(result.accessoryId);
    convertResultText.value = isClear
      ? `已为 ${result.converted} 张移除配饰。`
      : `已为 ${result.converted} 张佩戴「${targetLabel}」。`;
    return;
  }
  const targetLabel =
    materialTargetOptions.find((o) => o.value === convertTarget.value)?.label ??
    (convertTarget.value === DEV_DECK_CONVERT_TARGET_PLAIN ? "普通字母块" : convertTarget.value);
  convertResultText.value = `已转换 ${result.converted} 张为「${targetLabel}」。`;
}

function onJumpClick() {
  const raw = levelInput.value.trim();
  if (!raw) return;
  emit("jump-level", { levelId: raw });
}

function onBossShopJumpClick() {
  const slug = String(bossJumpSlug.value ?? "").trim();
  if (!slug) return;
  bossShopJumpResultText.value = "";
  emit("jump-boss-shop", { bossSlug: slug, levelId: levelInput.value.trim() });
}

/** @param {number} amount */
function formatBalanceLabel(amount) {
  const x = Math.floor(Number(amount) || 0);
  return x < 0 ? `-$${Math.abs(x)}` : `$${x}`;
}

function onSetBalanceClick() {
  balanceResultText.value = "";
  emit("set-balance", { amountRaw: balanceInput.value.trim() });
}

/** @param {{ ok: boolean, message: string, amount?: number }} result */
function reportBalanceResult(result) {
  balanceResultText.value = result?.message ?? "";
  if (result?.ok && Number.isFinite(result.amount)) {
    balanceInput.value = String(Math.floor(Number(result.amount) || 0));
  }
}

/** @param {{ ok: boolean, message: string }} result */
function reportBossShopJumpResult(result) {
  bossShopJumpResultText.value = result?.message ?? "";
}

function openTreasurePicker() {
  selectedTreasureCounts.value = {};
  treasurePickerPage.value = 0;
  showTreasurePicker.value = true;
}

function closeTreasurePicker() {
  showTreasurePicker.value = false;
  selectedTreasureCounts.value = {};
  treasurePickerPage.value = 0;
}

/** @param {number} delta */
function stepTreasurePickerPage(delta) {
  const count = treasurePickerPageCount.value;
  if (count <= 1) return;
  treasurePickerPage.value = Math.min(
    count - 1,
    Math.max(0, treasurePickerPage.value + Math.trunc(Number(delta) || 0)),
  );
}

function clearTreasureSelection() {
  selectedTreasureCounts.value = {};
}

/** @param {string} treasureId */
function onTreasureCellClick(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return;
  selectedTreasureCounts.value = {
    ...selectedTreasureCounts.value,
    [id]: pickCount(id) + 1,
  };
}

function flattenSelectedTreasureIds() {
  /** @type {string[]} */
  const ids = [];
  for (const [id, count] of Object.entries(selectedTreasureCounts.value)) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    for (let i = 0; i < n; i += 1) ids.push(id);
  }
  return ids;
}

function onGrantTreasuresConfirm() {
  const ids = flattenSelectedTreasureIds();
  if (!ids.length) return;
  emit("grant-treasures", { treasureIds: ids });
  closeTreasurePicker();
}

/** @param {{ granted: number, failed: number, cropCount: number }} summary */
function reportGrantResult(summary) {
  if (!summary?.granted) {
    grantResultText.value = "未能加入宝藏（槽位已满或无效 id）。";
    return;
  }
  const parts = [`已加入 ${summary.granted} 个宝藏`];
  if (summary.cropCount > 0) parts.push(`${summary.cropCount} 个带裁剪配饰`);
  if (summary.failed > 0) parts.push(`${summary.failed} 个失败`);
  grantResultText.value = `${parts.join("，")}。`;
}

defineExpose({
  reportConvertResult,
  reportGrantResult,
  reportBalanceResult,
  reportBossShopJumpResult,
  closeTreasurePicker,
  isTreasurePickerOpen: () => showTreasurePicker.value,
});
</script>

<style scoped>
.developer-options-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24 * var(--rpx)) calc(20 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  box-sizing: border-box;
  background: rgba(60, 58, 50, 0.88);
}

.developer-options-card {
  width: 100%;
  max-width: calc(700 * var(--rpx));
  max-height: min(88vh, calc(1200 * var(--rpx)));
  overflow: auto;
  background: var(--card-bright);
  border-radius: var(--radius);
  padding: calc(28 * var(--rpx)) calc(24 * var(--rpx)) calc(22 * var(--rpx));
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.developer-options-title {
  margin: 0 0 calc(18 * var(--rpx));
  font-size: calc(38 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
  text-align: center;
}

.developer-options-body {
  display: flex;
  flex-direction: column;
  gap: calc(18 * var(--rpx));
}

.developer-options-section {
  padding: calc(14 * var(--rpx)) calc(14 * var(--rpx)) calc(12 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: var(--card, #eee4da);
}

.developer-options-section-title {
  margin: 0 0 calc(10 * var(--rpx));
  font-size: calc(26 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
}

.developer-options-hint {
  margin: 0 0 calc(12 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  line-height: 1.55;
  color: var(--text-dark, #3c3a32);
}

.developer-options-select {
  margin: 0 calc(4 * var(--rpx));
  padding: calc(4 * var(--rpx)) calc(8 * var(--rpx));
  font-family: inherit;
  font-size: calc(22 * var(--rpx));
  border-radius: calc(6 * var(--rpx));
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.12);
  background: #fff;
  color: var(--text-dark, #3c3a32);
  max-width: calc(220 * var(--rpx));
}

.developer-options-row {
  display: flex;
  gap: calc(8 * var(--rpx));
  align-items: center;
}

.developer-options-row--boss-shop {
  margin-top: calc(10 * var(--rpx));
  align-items: stretch;
}

.developer-options-boss-select {
  position: relative;
  flex: 1;
  min-width: 0;
}

.developer-options-boss-select-trigger {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: calc(8 * var(--rpx));
  width: 100%;
  min-height: calc(72 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(12 * var(--rpx));
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.12);
  border-radius: calc(8 * var(--rpx));
  background: #fff;
  color: var(--text-dark, #3c3a32);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  box-sizing: border-box;
}

.developer-options-boss-select-copy {
  display: flex;
  flex-direction: column;
  gap: calc(4 * var(--rpx));
  min-width: 0;
  flex: 1;
}

.developer-options-boss-select-name {
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  line-height: 1.25;
}

.developer-options-boss-select-desc {
  font-size: calc(20 * var(--rpx));
  line-height: 1.45;
  color: rgba(60, 58, 50, 0.72);
}

.developer-options-boss-select-chevron {
  flex-shrink: 0;
  font-size: calc(28 * var(--rpx));
  line-height: 1;
  color: rgba(60, 58, 50, 0.55);
  transition: transform 0.15s ease;
}

.developer-options-boss-select-chevron--open {
  transform: rotate(180deg);
}

.developer-options-boss-select-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 4 * var(--rpx));
  z-index: 4;
  max-height: calc(360 * var(--rpx));
  margin: 0;
  padding: calc(6 * var(--rpx));
  list-style: none;
  overflow: auto;
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.12);
  border-radius: calc(8 * var(--rpx));
  background: #fff;
  box-shadow: var(--shadow);
  box-sizing: border-box;
}

.developer-options-boss-select-option {
  display: flex;
  flex-direction: column;
  gap: calc(4 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(10 * var(--rpx));
  border-radius: calc(6 * var(--rpx));
  cursor: pointer;
}

.developer-options-boss-select-option:hover,
.developer-options-boss-select-option--active {
  background: rgba(106, 127, 184, 0.12);
}

.developer-options-hint--compact {
  margin: calc(8 * var(--rpx)) 0 0;
  font-size: calc(20 * var(--rpx));
  color: rgba(60, 58, 50, 0.68);
}

.developer-options-input {
  flex: 1;
  min-width: 0;
  padding: calc(10 * var(--rpx)) calc(12 * var(--rpx));
  font-family: inherit;
  font-size: calc(24 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  border: calc(2 * var(--rpx)) solid rgba(0, 0, 0, 0.12);
  background: #fff;
  color: var(--text-dark, #3c3a32);
}

.developer-options-btn {
  border: none;
  border-radius: var(--radius);
  padding: calc(12 * var(--rpx)) calc(18 * var(--rpx));
  font-family: inherit;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow);
  color: #f9f6f2;
  background: #6a7fb8;
}

.developer-options-btn--secondary {
  background: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.22);
  box-shadow: none;
}

.developer-options-btn--confirm {
  background: #6a9e5c;
}

.developer-options-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.developer-options-result {
  margin: calc(10 * var(--rpx)) 0 0;
  font-size: calc(22 * var(--rpx));
  color: rgba(60, 58, 50, 0.78);
}

.developer-options-close {
  display: block;
  width: 100%;
  margin-top: calc(16 * var(--rpx));
  border: none;
  border-radius: var(--radius);
  padding: calc(12 * var(--rpx));
  font-family: inherit;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  cursor: pointer;
  background: var(--card, #eee4da);
  color: var(--text-dark, #3c3a32);
}

.developer-treasure-picker {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(16 * var(--rpx));
  background: rgba(0, 0, 0, 0.52);
  border-radius: inherit;
}

.developer-treasure-picker-card {
  width: 100%;
  max-width: calc(680 * var(--rpx));
  max-height: min(82vh, calc(1040 * var(--rpx)));
  display: flex;
  flex-direction: column;
  background: #7a6f65;
  border-radius: calc(14 * var(--rpx));
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.12);
  padding: calc(20 * var(--rpx)) calc(16 * var(--rpx)) calc(18 * var(--rpx));
  box-shadow: 0 calc(12 * var(--rpx)) calc(40 * var(--rpx)) rgba(0, 0, 0, 0.35);
  box-sizing: border-box;
}

.developer-treasure-picker-title {
  margin: 0 0 calc(6 * var(--rpx));
  text-align: center;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.developer-treasure-picker-title-main {
  display: block;
  font-size: calc(30 * var(--rpx));
  color: rgba(255, 255, 255, 0.95);
}

.developer-treasure-picker-title-count {
  display: block;
  margin-top: calc(4 * var(--rpx));
  font-size: calc(22 * var(--rpx));
  font-weight: 600;
  color: rgba(255, 255, 255, 0.68);
}

.developer-treasure-picker-hint {
  margin: 0 0 calc(12 * var(--rpx));
  text-align: center;
  font-size: calc(20 * var(--rpx));
  color: rgba(255, 255, 255, 0.58);
}

.developer-treasure-picker-grid-stage {
  flex-shrink: 0;
  margin-bottom: calc(12 * var(--rpx));
  padding: calc(4 * var(--rpx)) calc(2 * var(--rpx));
}

.developer-treasure-picker-grid {
  --treasure-collection-cell-size: calc(88 * var(--rpx));
  --treasure-picker-grid-gap: calc(8 * var(--rpx));
  display: grid;
  grid-template-columns: repeat(6, var(--treasure-collection-cell-size));
  grid-template-rows: repeat(5, var(--treasure-collection-cell-size));
  gap: var(--treasure-picker-grid-gap);
  justify-content: center;
  align-content: start;
  min-height: calc(
    var(--treasure-collection-cell-size) * 5 + var(--treasure-picker-grid-gap) * 4
  );
}

.developer-treasure-picker-pager {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(10 * var(--rpx));
  margin-bottom: calc(14 * var(--rpx));
}

.developer-treasure-picker-pager-btn {
  border: calc(2 * var(--rpx)) solid rgba(255, 255, 255, 0.22);
  border-radius: calc(10 * var(--rpx));
  padding: calc(10 * var(--rpx)) calc(16 * var(--rpx));
  font-family: inherit;
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.developer-treasure-picker-pager-btn:disabled {
  opacity: 0.38;
  cursor: default;
}

.developer-treasure-picker-pager-label {
  min-width: calc(96 * var(--rpx));
  text-align: center;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  color: rgba(255, 255, 255, 0.78);
}

.developer-treasure-picker-cell {
  position: relative;
  width: var(--treasure-collection-cell-size);
  height: var(--treasure-collection-cell-size);
  padding: 0;
  border: calc(3 * var(--rpx)) solid transparent;
  border-radius: calc(10 * var(--rpx));
  background: transparent;
  cursor: pointer;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.developer-treasure-picker-cell--picked {
  border-color: rgba(255, 255, 255, 0.88);
  box-shadow: 0 0 0 calc(2 * var(--rpx)) rgba(106, 159, 92, 0.65);
}

.developer-treasure-picker-cell :deep(.treasure-slot) {
  width: 100%;
  height: 100%;
}

.developer-treasure-picker-count {
  position: absolute;
  top: calc(3 * var(--rpx));
  right: calc(3 * var(--rpx));
  z-index: 2;
  min-width: calc(30 * var(--rpx));
  padding: 0 calc(6 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  background: #6a9e5c;
  color: #fff;
  font-size: calc(20 * var(--rpx));
  font-weight: 800;
  line-height: calc(28 * var(--rpx));
  text-align: center;
  box-shadow: 0 calc(2 * var(--rpx)) calc(6 * var(--rpx)) rgba(0, 0, 0, 0.28);
  pointer-events: none;
}

.developer-treasure-picker-actions.confirm-actions-row .developer-options-btn {
  flex: 1 1 0;
  min-width: 0;
}

.developer-treasure-picker-actions {
  flex-shrink: 0;
  display: flex;
  gap: calc(8 * var(--rpx));
  justify-content: center;
  flex-wrap: wrap;
}

.developer-options-layer-enter-active,
.developer-options-layer-leave-active {
  transition: opacity 0.28s var(--ease-expo-out, ease-out);
}

.developer-options-layer-enter-active .developer-options-card,
.developer-options-layer-leave-active .developer-options-card {
  transition:
    opacity 0.32s var(--ease-expo-out, ease-out),
    transform 0.32s var(--ease-expo-out, ease-out);
}

.developer-options-layer-enter-from,
.developer-options-layer-leave-to {
  opacity: 0;
}

.developer-options-layer-enter-from .developer-options-card,
.developer-options-layer-leave-to .developer-options-card {
  opacity: 0;
  transform: scale(0.94) translateY(calc(12 * var(--rpx)));
}
</style>
