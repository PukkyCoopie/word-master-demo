<template>
  <div
    class="info-layer"
    :class="{ 'portal-overlay--shop-upgrade-suppressed': overlaySuppressed }"
    role="dialog"
    aria-modal="true"
    aria-label="信息"
    :style="layerStackStyle"
  >
    <div class="info-layer-inner" @click.stop>
      <div class="info-tabs-outer">
        <div class="info-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            class="info-tab"
            :class="{ 'info-tab--active': activeTab === 'level' }"
            :aria-selected="activeTab === 'level'"
            @click="activeTab = 'level'"
          >
            等级
          </button>
          <button
            type="button"
            role="tab"
            class="info-tab"
            :class="{ 'info-tab--active': activeTab === 'rarity' }"
            :aria-selected="activeTab === 'rarity'"
            @click="activeTab = 'rarity'"
          >
            字母块
          </button>
          <button
            type="button"
            role="tab"
            class="info-tab"
            :class="{ 'info-tab--active': activeTab === 'stage' }"
            :aria-selected="activeTab === 'stage'"
            @click="activeTab = 'stage'"
          >
            关卡
          </button>
          <button
            type="button"
            role="tab"
            class="info-tab"
            :class="{ 'info-tab--active': activeTab === 'coupon' }"
            :aria-selected="activeTab === 'coupon'"
            @click="activeTab = 'coupon'"
          >
            优惠券
          </button>
        </div>
      </div>

      <div class="info-panel" :style="panelMinStyle">
        <div class="info-panel-slot">
        <div v-show="activeTab === 'level'" class="info-table-panel info-tab-layer" role="tabpanel">
          <table ref="levelTableRef" class="info-table" aria-label="等级与长度倍率">
            <colgroup>
              <col class="info-col-20" />
              <col class="info-col-20" />
              <col class="info-col-40" />
              <col class="info-col-20" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">单词长度</th>
                <th scope="col">等级</th>
                <th scope="col" class="info-th-level-score-mult" aria-label="分数（每字母）×倍率">
                  <div class="info-th-score-mult-head">
                    <span class="info-th-score-mult-head__a"
                      >分数<span class="info-th-score-mult-head__per-letter">（每字母）</span></span
                    >
                    <span class="info-th-score-mult-head__x" aria-hidden="true">×</span>
                    <span class="info-th-score-mult-head__b">倍率</span>
                  </div>
                </th>
                <th scope="col">拼出次数</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in lengthRows"
                :key="row.len"
                :class="idx % 2 === 0 ? 'info-row--even' : 'info-row--odd'"
              >
                <td class="info-td-len">{{ row.len }}</td>
                <td>
                  <span
                    class="info-pill info-pill--white"
                    :class="{ 'info-pill--default-level': row.level <= 1 }"
                    >{{ row.level }}</span
                  >
                </td>
                <td class="info-td-score-mult">
                  <div class="info-score-mult">
                    <span class="info-mini-box info-mini-box--score">{{ row.baseScore }}</span>
                    <span class="info-mini-times" aria-hidden="true">×</span>
                    <span class="info-mini-box info-mini-box--mult">{{ formatMult(row.mult) }}</span>
                  </div>
                </td>
                <td class="info-td-count" :class="{ 'info-td-count--zero': row.count === 0 }">{{ row.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-show="activeTab === 'rarity'"
          class="info-table-panel info-tab-layer info-tab-layer--rarity"
          role="tabpanel"
        >
          <table class="info-table info-table--rarity" aria-label="字母块等级与增益">
            <colgroup>
              <col class="info-col-rarity-name" />
              <col class="info-col-rarity-lv" />
              <col class="info-col-rarity-gain" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">稀有度</th>
                <th scope="col">等级</th>
                <th scope="col" class="info-th-rarity-gain" aria-label="分数与倍率（每字母）">
                  <div class="info-th-score-mult-head">
                    <span class="info-th-score-mult-head__a">分数</span>
                    <span class="info-th-score-mult-head__x">×</span>
                    <span class="info-th-score-mult-head__b">倍率</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in rarityRows"
                :key="row.key"
                :class="idx % 2 === 0 ? 'info-row--even' : 'info-row--odd'"
              >
                <td class="info-td-rarity-name">
                  <div class="info-rarity-name-row">
                    <span class="info-rarity-gem" :class="'gem-' + row.key" aria-hidden="true" />
                    <span>{{ row.label }}</span>
                  </div>
                </td>
                <td>
                  <span
                    class="info-pill info-pill--white"
                    :class="{ 'info-pill--default-level': row.level <= 1 }"
                    >{{ row.level }}</span
                  >
                </td>
                <td class="info-td-score-mult">
                  <div class="info-score-mult">
                    <span class="info-mini-box info-mini-box--score">{{ row.scoreBonus }}</span>
                    <span class="info-mini-times" aria-hidden="true">×</span>
                    <span class="info-mini-box info-mini-box--mult">{{ formatMult(row.multBonus) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-show="activeTab === 'stage'" class="info-placeholder info-tab-layer" role="tabpanel">
          <template v-if="runSeedDisplay">
            <p class="info-run-seed">
              <span class="info-run-seed-label">本局种子</span>
              <span class="info-run-seed-value">{{ runSeedDisplay }}</span>
            </p>
          </template>
          <template v-else>关卡信息稍后补充</template>
        </div>
        <div
          v-show="activeTab === 'coupon'"
          class="info-tab-layer info-tab-layer--vouchers"
          role="tabpanel"
          aria-label="已购买优惠券"
        >
          <div v-if="ownedVoucherDisplayRows.length === 0" class="info-voucher-empty">暂无已购优惠券</div>
          <div v-else class="info-voucher-grid">
            <div v-for="row in ownedVoucherDisplayRows" :key="row.id" class="info-voucher-cell">
              <VoucherStamp :emoji="row.emoji" :display-name="row.displayName" compact />
            </div>
          </div>
        </div>
        </div>
      </div>

      <button type="button" class="info-back-btn" @click="close">返回</button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  getBaseScorePerLetterForWordLength,
  getLengthMultiplier,
  LETTER_RARITY_ORDER,
  getRarityBonusForRarity,
  getRarityMultBonusForRarity,
} from "../composables/useScoring";
import { bumpOverlayZ } from "../game/overlayStack.js";
import { formatVoucherDisplayName } from "../vouchers/voucherDisplay.js";
import { pairHasTier2Owned } from "../vouchers/voucherDefinitions.js";
import { getVoucherDefOrNull } from "../vouchers/voucherRuntime.js";
import VoucherStamp from "./VoucherStamp.vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  /** @type {import('vue').PropType<Record<number, number>>} */
  spellCounts: { type: Object, default: () => ({}) },
  /** 各单词长度（3–16）的等级，默认可由父级初始化为 1，后续可升级 */
  /** @type {import('vue').PropType<Record<number, number>>} */
  lengthLevels: { type: Object, default: () => ({}) },
  /** 望远镜二级：超出整数等级的额外每字分数/倍率 */
  /** @type {import('vue').PropType<Record<number, { score?: number, mult?: number }>>} */
  lengthUpgradeObservatoryExtra: { type: Object, default: () => ({}) },
  /** common / rare / epic / legendary → 等级 */
  /** @type {import('vue').PropType<Record<string, number>>} */
  rarityLevels: { type: Object, default: () => ({}) },
  /** 本局已购买的优惠券 id 列表 */
  ownedVoucherIds: { type: Array, default: () => [] },
  overlaySuppressed: { type: Boolean, default: false },
  /** 本局种子显示串（只读） */
  runSeedDisplay: { type: String, default: "" },
});

const emit = defineEmits(["update:modelValue"]);

const stackZ = ref(0);
const layerStackStyle = computed(() => (stackZ.value > 0 ? { zIndex: stackZ.value } : undefined));

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      nextTick(() => {
        stackZ.value = bumpOverlayZ();
      });
    }
  },
  { immediate: true },
);

const activeTab = ref("level");

/** 等级 Tab 内表格（默认首屏、四 Tab 中最高），用于撑开中间区，避免固定 rpx 裁切 */
const levelTableRef = ref(null);
const panelMinHeightPx = ref(0);

const panelMinStyle = computed(() =>
  panelMinHeightPx.value > 0 ? { minHeight: `${panelMinHeightPx.value}px` } : undefined,
);

function measureLevelTabHeight() {
  if (activeTab.value !== "level") return;
  const el = levelTableRef.value;
  if (!el) return;
  const h = el.getBoundingClientRect().height || el.offsetHeight;
  const next = Math.ceil(h);
  if (next > 0) panelMinHeightPx.value = next;
}

function scheduleMeasureLevelTab() {
  nextTick(() => {
    measureLevelTabHeight();
    requestAnimationFrame(() => {
      measureLevelTabHeight();
    });
  });
}

let levelTableResizeObserver = null;

function onWindowResizeForInfoModal() {
  scheduleMeasureLevelTab();
}

onMounted(() => {
  scheduleMeasureLevelTab();
  const el = levelTableRef.value;
  if (el && typeof ResizeObserver !== "undefined") {
    levelTableResizeObserver = new ResizeObserver(() => {
      measureLevelTabHeight();
    });
    levelTableResizeObserver.observe(el);
  }
  window.addEventListener("resize", onWindowResizeForInfoModal);
});

onBeforeUnmount(() => {
  levelTableResizeObserver?.disconnect();
  levelTableResizeObserver = null;
  window.removeEventListener("resize", onWindowResizeForInfoModal);
});

watch(
  () => props.modelValue,
  (open) => {
    if (open) activeTab.value = "level";
    if (open) scheduleMeasureLevelTab();
  },
);

watch(activeTab, (tab) => {
  if (tab === "level") scheduleMeasureLevelTab();
});

watch(
  () => [props.lengthLevels, props.spellCounts, props.lengthUpgradeObservatoryExtra],
  () => {
    if (activeTab.value === "level") scheduleMeasureLevelTab();
  },
  { deep: true },
);

const lengthRows = computed(() => {
  const counts = props.spellCounts || {};
  const levels = props.lengthLevels || {};
  const obsExtra = props.lengthUpgradeObservatoryExtra || {};
  const rows = [];
  for (let len = 3; len <= 16; len++) {
    const lv = levels[len];
    rows.push({
      len,
      level: Math.max(1, Math.round(Number(lv)) || 1),
      baseScore: getBaseScorePerLetterForWordLength(len, levels, obsExtra),
      mult: getLengthMultiplier(len, levels, obsExtra),
      count: Math.max(0, Math.round(Number(counts[len]) || 0)),
    });
  }
  return rows;
});

const RARITY_UI_LABEL = Object.freeze({
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
});

const rarityRows = computed(() => {
  const levels = props.rarityLevels || {};
  return LETTER_RARITY_ORDER.map((k) => ({
    key: k,
    label: RARITY_UI_LABEL[k] ?? k,
    level: Math.max(1, Math.round(Number(levels[k])) || 1),
    scoreBonus: getRarityBonusForRarity(k, levels),
    multBonus: getRarityMultBonusForRarity(k, levels),
  }));
});

const ownedVoucherDisplayRows = computed(() => {
  const ids = Array.isArray(props.ownedVoucherIds) ? props.ownedVoucherIds.map(String) : [];
  return ids.map((id) => {
    const def = getVoucherDefOrNull(id);
    if (!def) {
      return { id, emoji: "❔", displayName: id };
    }
    return {
      id,
      emoji: def.emoji,
      displayName: formatVoucherDisplayName(def, {
        pairHasTier2Owned: pairHasTier2Owned(def.pairId, ids),
      }),
    };
  });
});

function formatMult(m) {
  const n = Number(m);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  const s = n.toFixed(1);
  return s.endsWith(".0") ? String(Math.round(n)) : s;
}

function close() {
  emit("update:modelValue", false);
}
</script>

<style scoped>
/* 扁平化：少阴影、纯色块，参考 2048 式简洁面板 */
.info-layer {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(16 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
}

.info-layer-inner {
  background: var(--card, #bbada0);
  border-radius: calc(10 * var(--rpx));
  width: 100%;
  max-width: calc(702 * var(--rpx));
  max-height: calc(100% - 24 * var(--rpx));
  /* 总高由内容 + 中间区 min-height（JS 按等级表量）决定，上限为视口；无固定 rpx 高度 */
  height: auto;
  display: grid;
  grid-template-rows: auto auto auto;
  grid-template-columns: minmax(0, 1fr);
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx)) calc(14 * var(--rpx));
  row-gap: calc(12 * var(--rpx));
  overflow: visible;
  box-sizing: border-box;
}

/* 勿用 overflow:hidden，否则激活 tab 下方小三角会被裁掉 */
.info-tabs-outer {
  grid-row: 1;
  position: relative;
  overflow: visible;
  z-index: 1;
}

/* 多个独立圆角矩形，中间留白 */
.info-tabs {
  display: flex;
  gap: calc(10 * var(--rpx));
  align-items: stretch;
  padding: 0;
  padding-bottom: calc(12 * var(--rpx));
  position: relative;
  overflow: visible;
  background: transparent;
}

.info-tab {
  flex: 1;
  min-width: 0;
  position: relative;
  border: none;
  padding: calc(12 * var(--rpx)) calc(6 * var(--rpx));
  font-family: inherit;
  font-size: calc(22 * var(--rpx));
  font-weight: 800;
  color: #faf8ef;
  background: #ed8c5c;
  cursor: pointer;
  border-radius: calc(10 * var(--rpx));
  transition:
    background 0.12s ease,
    filter 0.12s ease;
}

.info-tab:hover:not(.info-tab--active) {
  filter: brightness(1.06);
}

.info-tab:active:not(.info-tab--active) {
  filter: brightness(0.94);
}

.info-tab--active {
  color: #5c534c;
  background: #faf8ef;
  z-index: 2;
}

/* 小三角：在激活块下缘居中，尖端向下 */
.info-tab--active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: calc(-9 * var(--rpx));
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: calc(10 * var(--rpx)) solid transparent;
  border-right: calc(10 * var(--rpx)) solid transparent;
  border-top: calc(9 * var(--rpx)) solid #faf8ef;
  pointer-events: none;
  z-index: 3;
}

.info-panel {
  grid-row: 2;
  margin-top: calc(2 * var(--rpx));
  position: relative;
  overflow: hidden;
}

/* 中间区 min-height 由脚本按「等级」表量得，各 Tab 叠放于此，切换 Tab 不伸缩 */
.info-panel-slot {
  position: absolute;
  inset: 0;
  border-radius: calc(6 * var(--rpx));
  overflow: hidden;
}

.info-tab-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: calc(6 * var(--rpx));
  background: #eee4da;
}

.info-table-panel {
  padding: 0;
}

.info-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: calc(23 * var(--rpx));
  font-variant-numeric: tabular-nums;
  color: #776e65;
}

.info-col-20 {
  width: 20%;
}
.info-col-40 {
  width: 40%;
}

.info-table--rarity .info-col-rarity-name {
  width: 30%;
}
.info-table--rarity .info-col-rarity-lv {
  width: 18%;
}
.info-table--rarity .info-col-rarity-gain {
  width: 52%;
}

.info-th-rarity-gain {
  padding: calc(8 * var(--rpx)) calc(4 * var(--rpx));
}

.info-th-score-mult-head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(4 * var(--rpx));
  font-size: calc(18 * var(--rpx));
  font-weight: 800;
  color: #faf8ef;
  letter-spacing: 0.02em;
  line-height: 1.15;
}

.info-th-score-mult-head__x {
  font-size: calc(20 * var(--rpx));
  font-weight: 800;
  color: rgba(250, 248, 239, 0.88);
  flex-shrink: 0;
}

.info-th-score-mult-head__per-letter {
  font-size: calc(14 * var(--rpx));
  font-weight: 700;
  color: rgba(250, 248, 239, 0.48);
  letter-spacing: 0;
}

.info-th-level-score-mult {
  padding: calc(8 * var(--rpx)) calc(4 * var(--rpx));
}

/* 字母块 Tab：在固定高度槽内垂直居中，整体更疏、更大 */
.info-tab-layer--rarity {
  display: flex;
  flex-direction: column;
  justify-content: center;
  box-sizing: border-box;
  padding: calc(22 * var(--rpx)) calc(16 * var(--rpx));
}

.info-tab-layer--rarity .info-table--rarity {
  flex-shrink: 0;
  width: 100%;
  font-size: calc(26 * var(--rpx));
}

.info-tab-layer--rarity .info-table th {
  padding: calc(12 * var(--rpx)) calc(8 * var(--rpx));
  font-size: calc(22 * var(--rpx));
}

.info-tab-layer--rarity .info-table tbody td {
  padding: calc(14 * var(--rpx)) calc(8 * var(--rpx));
}

.info-tab-layer--rarity .info-th-rarity-gain {
  padding: calc(10 * var(--rpx)) calc(6 * var(--rpx));
}

.info-tab-layer--rarity .info-th-score-mult-head {
  font-size: calc(20 * var(--rpx));
  gap: calc(6 * var(--rpx));
}

.info-tab-layer--rarity .info-th-score-mult-head__x {
  font-size: calc(22 * var(--rpx));
}

.info-tab-layer--rarity .info-rarity-name-row {
  gap: calc(14 * var(--rpx));
}

.info-tab-layer--rarity .info-rarity-gem {
  width: calc(28 * var(--rpx));
  height: calc(28 * var(--rpx));
}

.info-tab-layer--rarity .info-pill--white {
  min-width: calc(52 * var(--rpx));
  padding: calc(7 * var(--rpx)) calc(12 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
}

.info-tab-layer--rarity .info-mini-box {
  min-width: calc(56 * var(--rpx));
  padding: calc(7 * var(--rpx)) calc(12 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
}

.info-tab-layer--rarity .info-mini-times {
  font-size: calc(30 * var(--rpx));
}

.info-tab-layer--rarity .info-score-mult {
  gap: calc(7 * var(--rpx));
}

.info-tab-layer--rarity .info-td-score-mult {
  padding: calc(6 * var(--rpx)) calc(4 * var(--rpx));
}

.info-rarity-name-row {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: calc(10 * var(--rpx));
  font-weight: 800;
}

/* 与棋盘 letter-gem 同色，尺寸放大便于表内辨认 */
.info-rarity-gem {
  flex-shrink: 0;
  width: calc(22 * var(--rpx));
  height: calc(22 * var(--rpx));
  border-radius: 50%;
  box-shadow: 0 calc(1 * var(--rpx)) calc(2 * var(--rpx)) rgba(0, 0, 0, 0.2);
}

.info-rarity-gem.gem-common {
  background: #e8e4dc;
  border: calc(1 * var(--rpx)) solid #9c8b7a;
  box-shadow: 0 calc(1 * var(--rpx)) calc(2 * var(--rpx)) rgba(0, 0, 0, 0.2);
}

.info-rarity-gem.gem-rare {
  background: #5b9bd5;
}

.info-rarity-gem.gem-epic {
  background: #9b59b6;
}

.info-rarity-gem.gem-legendary {
  background: #e67e22;
}

.info-table thead tr {
  background: #5c534c;
}

.info-table th {
  padding: calc(10 * var(--rpx)) calc(4 * var(--rpx));
  text-align: center;
  font-weight: 800;
  font-size: calc(20 * var(--rpx));
  color: #faf8ef;
  letter-spacing: 0.02em;
  border: none;
}

.info-table tbody td {
  padding: calc(6 * var(--rpx)) calc(4 * var(--rpx));
  text-align: center;
  vertical-align: middle;
  border: none;
}

.info-row--even {
  background: #eee4da;
}

.info-row--odd {
  background: #e4d9ce;
}

.info-td-len {
  font-weight: 800;
}

.info-td-count {
  font-weight: 800;
  padding-left: calc(2 * var(--rpx));
  padding-right: calc(2 * var(--rpx));
}

.info-td-count--zero {
  opacity: 0.45;
}

.info-pill--white {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(44 * var(--rpx));
  padding: calc(5 * var(--rpx)) calc(10 * var(--rpx));
  background: #faf8ef;
  color: #5c534c;
  border-radius: calc(6 * var(--rpx));
  font-weight: 800;
  font-size: calc(24 * var(--rpx));
  line-height: 1;
}

.info-pill--default-level {
  opacity: 0.55;
}

.info-td-score-mult {
  padding: calc(4 * var(--rpx)) calc(4 * var(--rpx));
}

.info-score-mult {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(5 * var(--rpx));
  flex-wrap: nowrap;
}

.info-mini-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: calc(48 * var(--rpx));
  padding: calc(5 * var(--rpx)) calc(10 * var(--rpx));
  border-radius: calc(6 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.info-mini-box--score {
  background: #6ec4f0;
}

.info-mini-box--mult {
  background: var(--mult-accent);
}

.info-mini-times {
  font-size: calc(26 * var(--rpx));
  font-weight: 800;
  color: #8f7a66;
  flex-shrink: 0;
  line-height: 1;
}

.info-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(24 * var(--rpx));
  color: #8f7a66;
}

.info-run-seed {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(10 * var(--rpx));
  font-size: calc(24 * var(--rpx));
  color: #8f7a66;
}

.info-run-seed-value {
  font-size: calc(30 * var(--rpx));
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #3c3a32;
}

.info-back-btn {
  grid-row: 3;
  width: 100%;
  border: none;
  border-radius: calc(6 * var(--rpx));
  padding: calc(14 * var(--rpx)) calc(20 * var(--rpx));
  font-family: inherit;
  font-size: calc(28 * var(--rpx));
  font-weight: 800;
  color: #faf8ef;
  background: #edc22e;
  cursor: pointer;
  transition: filter 0.1s ease;
}

.info-back-btn:hover {
  filter: brightness(1.05);
}

.info-back-btn:active {
  filter: brightness(0.95);
}
</style>
