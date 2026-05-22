<template>
  <div
    class="info-layer"
    :class="{
      'portal-overlay--shop-upgrade-suppressed': overlaySuppressed,
      'info-layer--stagger-guard': openingStaggerGuard,
    }"
    role="dialog"
    aria-modal="true"
    aria-label="信息"
    :style="layerStackStyle"
  >
    <div
      ref="layerInnerRef"
      class="info-layer-inner"
      @click.stop
      @transitionend="onLayerInnerTransitionEnd"
    >
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
        <div
          v-show="activeTab === 'level'"
          ref="levelTabRef"
          class="info-table-panel info-tab-layer"
          role="tabpanel"
        >
          <table ref="levelTableRef" class="info-table" aria-label="等级与长度倍率">
            <colgroup>
              <col class="info-col-20" />
              <col class="info-col-20" />
              <col class="info-col-40" />
              <col class="info-col-20" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col"><span class="info-stagger-el">单词长度</span></th>
                <th scope="col"><span class="info-stagger-el">等级</span></th>
                <th scope="col" class="info-th-level-score-mult" aria-label="分数（每字母）×倍率">
                  <div class="info-th-score-mult-head info-stagger-el">
                    <span class="info-th-score-mult-head__a"
                      >分数<span class="info-th-score-mult-head__per-letter">（每字母）</span></span
                    >
                    <span class="info-th-score-mult-head__x" aria-hidden="true">×</span>
                    <span class="info-th-score-mult-head__b">倍率</span>
                  </div>
                </th>
                <th scope="col"><span class="info-stagger-el">拼出次数</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in lengthRows"
                :key="row.len"
                :class="idx % 2 === 0 ? 'info-row--even' : 'info-row--odd'"
              >
                <td class="info-td-len"><span class="info-stagger-el">{{ row.len }}</span></td>
                <td>
                  <span class="info-stagger-el info-stagger-el--pill">
                    <span
                      class="info-pill info-pill--white"
                      :class="{ 'info-pill--default-level': row.level <= 1 }"
                      >{{ row.level }}</span
                    >
                  </span>
                </td>
                <td class="info-td-score-mult">
                  <div class="info-score-mult info-stagger-el">
                    <span class="info-mini-box info-mini-box--score">{{ row.baseScore }}</span>
                    <span class="info-mini-times" aria-hidden="true">×</span>
                    <span class="info-mini-box info-mini-box--mult">{{ formatMult(row.mult) }}</span>
                  </div>
                </td>
                <td class="info-td-count" :class="{ 'info-td-count--zero': row.count === 0 }">
                  <span class="info-stagger-el">{{ row.count }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-show="activeTab === 'rarity'"
          ref="rarityTabRef"
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
                <th scope="col"><span class="info-stagger-el">稀有度</span></th>
                <th scope="col"><span class="info-stagger-el">等级</span></th>
                <th scope="col" class="info-th-rarity-gain" aria-label="分数与倍率（每字母）">
                  <div class="info-th-score-mult-head info-stagger-el">
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
                  <div class="info-rarity-name-row info-stagger-el">
                    <span class="info-rarity-gem" :class="'gem-' + row.key" aria-hidden="true" />
                    <span>{{ row.label }}</span>
                  </div>
                </td>
                <td>
                  <span class="info-stagger-el info-stagger-el--pill">
                    <span
                      class="info-pill info-pill--white"
                      :class="{ 'info-pill--default-level': row.level <= 1 }"
                      >{{ row.level }}</span
                    >
                  </span>
                </td>
                <td class="info-td-score-mult">
                  <div class="info-score-mult info-stagger-el">
                    <span class="info-mini-box info-mini-box--score">{{ row.scoreBonus }}</span>
                    <span class="info-mini-times" aria-hidden="true">×</span>
                    <span class="info-mini-box info-mini-box--mult">{{ formatMult(row.multBonus) }}</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-show="activeTab === 'stage'"
          ref="stageTabRef"
          class="info-tab-layer info-tab-layer--stage"
          role="tabpanel"
          aria-label="关卡进度"
        >
          <div v-if="runSeedDisplay" class="info-stage-seed-bar info-stagger-el">
            <div class="info-stage-seed-main">
              <span class="info-stage-seed-label">本局种子</span>
              <span class="info-stage-seed-value">{{ runSeedDisplay }}</span>
            </div>
            <button
              type="button"
              class="info-stage-seed-copy"
              :title="seedCopyDone ? '已复制' : '复制种子'"
              :aria-label="seedCopyDone ? '已复制' : '复制本局种子'"
              @click="copyRunSeed"
            >
              <i :class="seedCopyDone ? 'ri-check-line' : 'ri-file-copy-line'" aria-hidden="true"></i>
            </button>
          </div>

          <div v-if="stageProgressRows.length" class="info-stage-progress">
            <template v-for="(row, rowIdx) in stageProgressRows" :key="row.rowKey">
              <div
                v-if="rowIdx > 0 && !stageProgressRows[rowIdx - 1]?.empty"
                class="info-stage-v-connector info-stagger-el"
                :class="{ 'info-stage-v-connector--active': vConnectorActiveForRow(row) }"
                aria-hidden="true"
              >
                <i class="ri-arrow-down-s-line"></i>
              </div>
              <div
                class="info-stage-progress-slot"
                :class="{ 'info-stage-progress-slot--empty': row.empty }"
              >
              <div
                class="info-stage-chapter-row"
                :class="{
                  'info-stage-chapter-row--fade-up': row.fadeMask === 'up',
                  'info-stage-chapter-row--fade-down': row.fadeMask === 'down',
                  'info-stage-chapter-row--empty': row.empty,
                }"
              >
                <template v-if="!row.empty">
                  <template v-for="(block, blockIdx) in row.blocks" :key="block.id">
                  <span
                    v-if="blockIdx > 0"
                    class="info-stage-inline-connector info-stagger-el"
                    :class="{ 'info-stage-inline-connector--active': inlineConnectorActiveBefore(block.id) }"
                    aria-hidden="true"
                  >
                    <i class="ri-arrow-right-s-line"></i>
                  </span>
                  <div
                    class="info-stage-block info-stage-block--tile info-stagger-el"
                    :class="{ 'info-stage-block--current': block.isCurrent }"
                  >
                    <div class="info-stage-block-inner">
                      <div class="info-stage-block-id">{{ block.id }}</div>
                      <div class="info-stage-block-score">
                        <span class="info-stage-block-score-label">至少得分</span>
                        <span class="info-stage-block-score-value">{{
                          formatStageTargetScore(block.targetScore)
                        }}</span>
                      </div>
                    </div>
                  </div>
                  </template>
                  <div
                    class="info-stage-row-desc info-stagger-el"
                    :class="{ 'info-stage-row-desc--empty': !row.blocks[2]?.bossName }"
                  >
                    <template v-if="row.blocks[2]?.bossName">
                      <div class="info-stage-block-boss-name">{{ row.blocks[2].bossName }}</div>
                      <div class="info-stage-block-boss-req">{{ row.blocks[2].bossRequirement }}</div>
                    </template>
                  </div>
                </template>
              </div>
              </div>
            </template>
          </div>
          <div v-else class="info-stage-empty info-stagger-el">关卡信息稍后补充</div>
        </div>
        <div
          v-show="activeTab === 'coupon'"
          ref="couponTabRef"
          class="info-tab-layer info-tab-layer--vouchers"
          role="tabpanel"
          aria-label="已购买优惠券"
        >
          <div v-if="ownedVoucherPairGroups.length === 0" class="info-voucher-empty info-stagger-el">暂无已购优惠券</div>
          <div v-else class="info-voucher-grid">
            <button
              v-for="group in ownedVoucherPairGroups"
              :key="group.pairId"
              type="button"
              class="info-voucher-cell info-stagger-el"
              @click="onOwnedVoucherClick(group, $event)"
            >
              <VoucherStampStack :stamps="voucherStampsForGroup(group)" />
              <p class="info-voucher-name">{{ ownedVoucherGroupDisplayName(group) }}</p>
            </button>
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
import {
  buildInfoStageProgressRows,
  formatStageTargetScore,
  isInfoStageInlineConnectorActive,
  isInfoStageVConnectorActive,
  resolveInfoStageShopConnector,
} from "../game/infoStageProgress.js";
import { bumpOverlayZ } from "../game/overlayStack.js";
import {
  buildOwnedVoucherPairGroups,
  ownedVoucherGroupDisplayName,
  voucherStampsForOwnedGroup,
} from "../vouchers/voucherOwnedDisplay.js";
import VoucherStampStack from "./VoucherStampStack.vue";
import gsap from "gsap";
import {
  playInfoCouponTabEnter,
  playInfoGridTabEnter,
  prepareInfoCouponTabEnter,
  prepareInfoGridTabEnter,
} from "../game/infoModalTabEnterAnim.js";
import { formatCompactOneDecimal } from "./detailLayerFormatters.js";

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
  /** 当前关卡 id（如 1-2） */
  currentLevelId: { type: String, default: "" },
  /** 局种子数值（Boss 预览等） */
  runSeedNumeric: { type: Number, default: 0 },
  /** 当前 Boss 关 slug（非 Boss 关可空） */
  activeBossSlug: { type: String, default: "" },
  /** 打开弹窗时默认 Tab：level | rarity | stage | coupon */
  initialTab: { type: String, default: "level" },
  /** 处于商店：进度高亮在关卡间箭头上，而非方块 */
  inShop: { type: Boolean, default: false },
  /** 商店内下一小关 id（与 GamePanel getNextLevelDefAfterShop 一致） */
  nextLevelId: { type: String, default: "" },
  /** 是否已进入无尽模式（未进入前关卡进度最多展示到 8 大关） */
  isEndlessRun: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue", "select-owned-voucher"]);

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

const levelTabRef = ref(null);
const rarityTabRef = ref(null);
const stageTabRef = ref(null);
const couponTabRef = ref(null);

/** @type {Record<string, import('vue').Ref<HTMLElement | null>>} */
const INFO_TAB_PANEL_REF = {
  level: levelTabRef,
  rarity: rarityTabRef,
  stage: stageTabRef,
  coupon: couponTabRef,
};


/** 等级 Tab 内表格（四 Tab 中最高），用于固定中间区高度，切换 Tab 不伸缩 */
const levelTableRef = ref(null);
const layerInnerRef = ref(null);
const panelMinHeightPx = ref(0);
/** @type {ReturnType<typeof setTimeout> | null} */
let measureLevelTabTimer = null;
const seedCopyDone = ref(false);
let seedCopyResetTimer = /** @type {ReturnType<typeof setTimeout> | null} */ (null);

const panelMinStyle = computed(() => {
  const h = panelMinHeightPx.value;
  if (h <= 0) return undefined;
  return { minHeight: `${h}px`, height: `${h}px` };
});

/**
 * 布局高度（不受祖先 transform 缩放影响）
 * @param {HTMLElement} el
 */
function readLayoutHeight(el) {
  return Math.ceil(Math.max(el.offsetHeight, el.scrollHeight) || 0);
}

/**
 * 等级表在其它 Tab 激活时会被 v-show 隐藏，用离屏克隆量高。
 * @param {HTMLTableElement} table
 * @returns {number}
 */
function measureLevelTableCloneHeight(table) {
  const slot = table.closest(".info-panel-slot");
  const panel = slot?.parentElement;
  const w = panel?.offsetWidth ?? table.offsetWidth;
  if (!w || w <= 0) return 0;

  const holder = document.createElement("div");
  holder.style.cssText = `position:absolute;left:-9999px;top:0;width:${w}px;visibility:hidden;pointer-events:none;`;
  const clone = /** @type {HTMLTableElement} */ (table.cloneNode(true));
  holder.appendChild(clone);
  document.body.appendChild(holder);
  const h = readLayoutHeight(clone);
  document.body.removeChild(holder);
  return h;
}

function measureLevelTabHeight() {
  const table = levelTableRef.value;
  if (!table) return;

  const layer = table.closest(".info-tab-layer");
  const layerVisible = layer && getComputedStyle(layer).display !== "none";
  let h = 0;
  if (layerVisible) {
    h = readLayoutHeight(table);
  }
  if (h <= 0) {
    h = measureLevelTableCloneHeight(table);
  }
  if (h > 0) panelMinHeightPx.value = h;
}

/** @param {{ delay?: number }} [opts] */
function scheduleMeasureLevelTabHeight(opts = {}) {
  const delay = opts.delay ?? 0;
  const run = () => {
    nextTick(() => {
      measureLevelTabHeight();
      requestAnimationFrame(() => measureLevelTabHeight());
    });
  };
  if (measureLevelTabTimer) clearTimeout(measureLevelTabTimer);
  if (delay > 0) {
    measureLevelTabTimer = setTimeout(() => {
      measureLevelTabTimer = null;
      run();
    }, delay);
  } else {
    run();
  }
}

/** 外壳 transform 入场结束后补量（与 CSS 0.32s 对齐） */
function onLayerInnerTransitionEnd(ev) {
  if (ev.target !== layerInnerRef.value) return;
  if (ev.propertyName !== "transform") return;
  if (!props.modelValue) return;
  measureLevelTabHeight();
}

let levelTableResizeObserver = null;

function onWindowResizeForInfoModal() {
  scheduleMeasureLevelTabHeight();
}

onMounted(() => {
  scheduleMeasureLevelTabHeight();
  const el = levelTableRef.value;
  if (el && typeof ResizeObserver !== "undefined") {
    levelTableResizeObserver = new ResizeObserver(() => {
      measureLevelTabHeight();
    });
    levelTableResizeObserver.observe(el);
  }
  window.addEventListener("resize", onWindowResizeForInfoModal);
  if (props.modelValue) {
    applyInfoModalOpenState();
  }
});

function killAllInfoStaggerTweens() {
  for (const panelRef of Object.values(INFO_TAB_PANEL_REF)) {
    const panel = panelRef.value;
    if (!panel) continue;
    const els = panel.querySelectorAll(".info-stagger-el");
    if (els.length) gsap.killTweensOf(els);
  }
}

function collectActiveTabStaggerTargets() {
  const panel = INFO_TAB_PANEL_REF[activeTab.value]?.value;
  if (!panel) return [];
  return [...panel.querySelectorAll(".info-stagger-el")];
}

function prepareActiveTabEnterHidden() {
  const tab = activeTab.value;
  const targets = collectActiveTabStaggerTargets();
  if (tab === "coupon") {
    prepareInfoCouponTabEnter(targets);
  } else {
    prepareInfoGridTabEnter(targets);
  }
}

function runActiveTabEnterAnim() {
  if (!props.modelValue) return;
  const tab = activeTab.value;
  const targets = collectActiveTabStaggerTargets();
  if (tab === "coupon") {
    playInfoCouponTabEnter(targets);
  } else {
    playInfoGridTabEnter(targets);
  }
}

/** @type {ReturnType<typeof setTimeout> | null} */
let tabEnterAnimTimer = null;
let skipTabSwitchAnim = false;
const openingStaggerGuard = ref(true);

/** @param {{ delay?: number }} [opts] */
function scheduleActiveTabEnterAnim(opts = {}) {
  if (!props.modelValue) return;
  const delay = opts.delay ?? 0;
  if (tabEnterAnimTimer) clearTimeout(tabEnterAnimTimer);
  tabEnterAnimTimer = setTimeout(() => {
    tabEnterAnimTimer = null;
    nextTick(() => runActiveTabEnterAnim());
  }, delay);
}

onBeforeUnmount(() => {
  if (measureLevelTabTimer) clearTimeout(measureLevelTabTimer);
  measureLevelTabTimer = null;
  if (tabEnterAnimTimer) clearTimeout(tabEnterAnimTimer);
  tabEnterAnimTimer = null;
  killAllInfoStaggerTweens();
  levelTableResizeObserver?.disconnect();
  levelTableResizeObserver = null;
  window.removeEventListener("resize", onWindowResizeForInfoModal);
  if (seedCopyResetTimer) clearTimeout(seedCopyResetTimer);
});

const VALID_INFO_TABS = new Set(["level", "rarity", "stage", "coupon"]);

/** 打开弹窗：设 Tab、量高、与外壳同时播当前 Tab 入场（v-if 挂载时 watch 不会触发，onMounted 也需调用） */
function applyInfoModalOpenState() {
  skipTabSwitchAnim = true;
  openingStaggerGuard.value = true;
  const tab = String(props.initialTab ?? "level");
  activeTab.value = VALID_INFO_TABS.has(tab) ? tab : "level";
  scheduleMeasureLevelTabHeight();
  scheduleMeasureLevelTabHeight({ delay: 340 });
  nextTick(() => {
    prepareActiveTabEnterHidden();
    openingStaggerGuard.value = false;
    runActiveTabEnterAnim();
    skipTabSwitchAnim = false;
  });
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      applyInfoModalOpenState();
    } else {
      openingStaggerGuard.value = true;
      panelMinHeightPx.value = 0;
    }
  },
);

watch(activeTab, () => {
  if (!props.modelValue || skipTabSwitchAnim) return;
  if (tabEnterAnimTimer) {
    clearTimeout(tabEnterAnimTimer);
    tabEnterAnimTimer = null;
  }
  killAllInfoStaggerTweens();
  scheduleActiveTabEnterAnim({ delay: 0 });
});

watch(
  () => [props.lengthLevels, props.spellCounts, props.lengthUpgradeObservatoryExtra],
  () => {
    scheduleMeasureLevelTabHeight();
  },
  { deep: true },
);

const stageProgressRows = computed(() => {
  const id = String(props.currentLevelId ?? "").trim();
  if (!id) return [];
  return buildInfoStageProgressRows({
    currentLevelId: id,
    activeBossSlug: props.activeBossSlug,
    runSeedNumeric: props.runSeedNumeric,
    inShop: props.inShop,
    isEndlessRun: props.isEndlessRun,
  });
});

const stageShopConnector = computed(() =>
  props.inShop
    ? resolveInfoStageShopConnector(props.currentLevelId, props.nextLevelId)
    : { vBeforeChapter: null, inlineBeforeLevelId: null },
);

/** @param {import('../game/infoStageProgress.js').InfoStageChapterRow} row */
function vConnectorActiveForRow(row) {
  return isInfoStageVConnectorActive(row, stageShopConnector.value.vBeforeChapter);
}

/** @param {string} levelId */
function inlineConnectorActiveBefore(levelId) {
  return isInfoStageInlineConnectorActive(levelId, stageShopConnector.value.inlineBeforeLevelId);
}

async function copyRunSeed() {
  const text = String(props.runSeedDisplay ?? "").trim();
  if (!text) return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    seedCopyDone.value = true;
    if (seedCopyResetTimer) clearTimeout(seedCopyResetTimer);
    seedCopyResetTimer = setTimeout(() => {
      seedCopyDone.value = false;
      seedCopyResetTimer = null;
    }, 2000);
  } catch {
    /* 忽略复制失败 */
  }
}

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

const ownedVoucherPairGroups = computed(() => {
  const ids = Array.isArray(props.ownedVoucherIds) ? props.ownedVoucherIds : [];
  return buildOwnedVoucherPairGroups(ids);
});

/** @param {ReturnType<typeof buildOwnedVoucherPairGroups>[number]} group */
function voucherStampsForGroup(group) {
  return voucherStampsForOwnedGroup(group);
}

/** @param {ReturnType<typeof buildOwnedVoucherPairGroups>[number]} group @param {MouseEvent} event */
function onOwnedVoucherClick(group, event) {
  const el = event.currentTarget;
  emit("select-owned-voucher", {
    pairId: group.pairId,
    originEl: el instanceof HTMLElement ? el : null,
  });
}

const formatMult = formatCompactOneDecimal;

function close() {
  emit("update:modelValue", false);
}
</script>

<style scoped>
/* 扁平化：少阴影、纯色块，参考 2048 式简洁面板 */
.info-stagger-el {
  display: inline-block;
  vertical-align: middle;
}

/* 外壳 CSS 入场期间先藏住内容，避免首帧全显再等 GSAP */
.info-layer-enter-active .info-stagger-el {
  opacity: 0;
}

/* 防止偶发首帧先渲染终态：等 prepare + run 建立起始态后再放开 */
.info-layer--stagger-guard .info-stagger-el {
  opacity: 0;
}

.info-score-mult.info-stagger-el,
.info-th-score-mult-head.info-stagger-el {
  display: flex;
}

.info-rarity-name-row.info-stagger-el,
.info-stagger-el--pill {
  display: inline-flex;
  vertical-align: middle;
}

.info-voucher-cell.info-stagger-el {
  transform-origin: center center;
}

.info-layer {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(16 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  overflow: hidden;
  box-sizing: border-box;
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
  overflow: hidden;
  box-sizing: border-box;
}

/* Tab 小三角在 .info-tabs-outer 内，勿对该层 overflow:hidden */
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
  box-sizing: border-box;
}

.info-tab-layer--vouchers {
  background: transparent;
}

.info-table-panel {
  padding: 0;
  height: 100%;
  overflow: hidden;
  box-sizing: border-box;
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
  overflow: hidden;
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

.info-tab-layer--stage {
  --info-stage-gap-v: calc(14 * var(--rpx));
  --info-stage-gap-h: calc(3 * var(--rpx));
  --info-stage-connector-w: calc(18 * var(--rpx));
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--info-stage-gap-v);
  height: 100%;
  padding: 0;
  overflow: hidden;
  background: transparent;
  box-sizing: border-box;
}

.info-stage-seed-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: calc(10 * var(--rpx));
  width: 100%;
  box-sizing: border-box;
  padding: calc(12 * var(--rpx)) calc(14 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: #eee4da;
}

.info-stage-seed-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: calc(6 * var(--rpx));
  text-align: left;
}

.info-stage-seed-label {
  font-size: calc(22 * var(--rpx));
  font-weight: 700;
  color: #8f7a66;
}

.info-stage-seed-value {
  font-size: calc(34 * var(--rpx));
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #3c3a32;
  word-break: break-all;
  line-height: 1.2;
}

.info-stage-seed-copy {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: calc(50 * var(--rpx));
  height: calc(50 * var(--rpx));
  border: none;
  border-radius: calc(8 * var(--rpx));
  background: #faf8ef;
  color: #5c534c;
  font-size: calc(28 * var(--rpx));
  cursor: pointer;
  transition: filter 0.1s ease;
}

.info-stage-seed-copy:hover {
  filter: brightness(1.04);
}

.info-stage-seed-copy:active {
  filter: brightness(0.94);
}

.info-stage-progress {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: var(--info-stage-gap-v);
  width: 100%;
  padding: 0;
  box-sizing: border-box;
}

/* 夹在两行槽位之间，由父级 gap 均分；视觉层绝对居中，不改变槽位占位 */
.info-stage-v-connector {
  position: relative;
  z-index: 3;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin: 0;
  color: #8f7a66;
  line-height: 1;
  pointer-events: none;
}

.info-stage-v-connector > i {
  position: relative;
  z-index: 1;
  font-size: calc(34 * var(--rpx));
  line-height: 1;
}

.info-stage-v-connector--active::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(48 * var(--rpx));
  height: calc(44 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: var(--btn-yellow, #edc22e);
  box-shadow: 0 calc(2 * var(--rpx)) calc(6 * var(--rpx)) rgba(237, 194, 46, 0.28);
  z-index: 0;
}

.info-stage-v-connector--active {
  color: #faf8ef;
}

.info-stage-v-connector--active > i {
  font-size: calc(36 * var(--rpx));
}

.info-stage-progress-slot {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.info-stage-progress-slot:not(.info-stage-progress-slot--empty) {
  justify-content: center;
}

.info-stage-progress-slot:not(.info-stage-progress-slot--empty) .info-stage-chapter-row:not(.info-stage-chapter-row--empty) {
  flex: 0 0 auto;
  width: 100%;
  height: auto;
  margin-block: auto;
}

.info-stage-chapter-row:not(.info-stage-chapter-row--empty) {
  flex-shrink: 0;
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    var(--info-stage-connector-w)
    minmax(0, 1fr)
    var(--info-stage-connector-w)
    minmax(0, 1fr)
    minmax(0, 1.18fr);
  align-items: stretch;
  column-gap: var(--info-stage-gap-h);
  width: 100%;
  overflow: visible;
}

/* 非当前行：mask 渐变淡出（50% 可见 → 透明），不用整体 opacity */
.info-stage-chapter-row--fade-up {
  -webkit-mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
  mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.info-stage-chapter-row--fade-down {
  -webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
  mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0) 100%);
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
}

.info-stage-chapter-row--empty {
  flex: 1 1 auto;
  min-height: 0;
  pointer-events: none;
}

.info-stage-inline-connector {
  position: relative;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  width: var(--info-stage-connector-w);
  min-width: 0;
  max-width: var(--info-stage-connector-w);
  padding: 0;
  margin: 0;
  overflow: visible;
  color: #a39489;
  line-height: 1;
  pointer-events: none;
}

.info-stage-inline-connector > i {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
  font-size: calc(28 * var(--rpx));
  line-height: 1;
}

.info-stage-inline-connector--active::before {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: calc(40 * var(--rpx));
  height: calc(40 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: var(--btn-yellow, #edc22e);
  box-shadow: 0 calc(2 * var(--rpx)) calc(6 * var(--rpx)) rgba(237, 194, 46, 0.28);
  z-index: 0;
}

.info-stage-inline-connector--active {
  color: #faf8ef;
}

.info-stage-inline-connector--active > i {
  font-size: calc(30 * var(--rpx));
}

.info-stage-block {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  border-radius: calc(10 * var(--rpx));
  background: #eee4da;
  overflow: hidden;
}

.info-stage-block-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  padding: calc(11 * var(--rpx)) calc(12 * var(--rpx));
  box-sizing: border-box;
  text-align: left;
}

/* [方] > [方] > [方] [说明]：三格正方形；说明区与方块同高（行高由方块撑开） */
.info-stage-block--tile {
  width: 100%;
  max-width: 100%;
  aspect-ratio: 1;
  height: auto;
  justify-self: center;
  align-self: start;
}

.info-stage-row-desc {
  align-self: stretch;
  height: auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: calc(6 * var(--rpx));
  padding: calc(11 * var(--rpx)) calc(12 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: #e4d9ce;
  box-sizing: border-box;
  text-align: left;
  overflow: visible;
}

.info-stage-row-desc--empty {
  background: transparent;
  pointer-events: none;
}

.info-stage-block--current {
  box-shadow: 0 calc(2 * var(--rpx)) calc(8 * var(--rpx)) rgba(185, 148, 32, 0.32);
}

.info-stage-block--current .info-stage-block-inner {
  background: var(--btn-yellow, #edc22e);
  box-shadow: inset 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.28);
}

.info-stage-block--current .info-stage-block-id {
  color: #faf8ef;
  text-shadow: 0 calc(1 * var(--rpx)) 0 rgba(119, 110, 101, 0.12);
}

.info-stage-block--current .info-stage-block-score-label {
  color: #8a6f3a;
  font-weight: 700;
}

.info-stage-block--current .info-stage-block-score-value {
  color: #3c3a32;
}

.info-stage-block-id {
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  color: #8f7a66;
  line-height: 1.1;
  letter-spacing: 0.03em;
}

.info-stage-block-score {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  gap: calc(5 * var(--rpx));
  width: 100%;
  margin-top: calc(10 * var(--rpx));
  line-height: 1.15;
}

.info-stage-block-score-label {
  font-size: calc(18 * var(--rpx));
  font-weight: 600;
  color: #a39489;
}

.info-stage-block-score-value {
  font-size: calc(34 * var(--rpx));
  font-weight: 800;
  color: #3c3a32;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1.05;
}

.info-stage-block-boss-name {
  font-size: calc(22 * var(--rpx));
  font-weight: 800;
  color: #5c534c;
  line-height: 1.2;
  width: 100%;
}

.info-stage-block-boss-req {
  font-size: calc(18 * var(--rpx));
  font-weight: 600;
  color: #8f7a66;
  line-height: 1.3;
  width: 100%;
}

.info-stage-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(16 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: #eee4da;
  font-size: calc(24 * var(--rpx));
  color: #8f7a66;
  text-align: center;
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

/* 开闭：与 PauseOptionsLayer 同款蒙层淡入 + 卡片缩放 */
.info-layer-enter-active,
.info-layer-leave-active {
  transition: opacity 0.28s var(--ease-expo-out, ease-out);
}

.info-layer-enter-active .info-layer-inner,
.info-layer-leave-active .info-layer-inner {
  transition:
    opacity 0.32s var(--ease-expo-out, ease-out),
    transform 0.32s var(--ease-expo-out, ease-out);
}

.info-layer-enter-from,
.info-layer-leave-to {
  opacity: 0;
}

.info-layer-enter-from .info-layer-inner,
.info-layer-leave-to .info-layer-inner {
  opacity: 0;
  transform: scale(0.94) translateY(calc(12 * var(--rpx)));
}
</style>
