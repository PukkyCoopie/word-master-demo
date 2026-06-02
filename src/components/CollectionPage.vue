<template>
  <div class="collection-page">
    <header class="collection-header">
      <button type="button" class="collection-back-btn" aria-label="返回主菜单" @click="$emit('back')">
        <i class="ri-arrow-left-line collection-back-btn__icon" aria-hidden="true"></i>
        <span class="collection-back-btn__label">返回</span>
      </button>
      <div class="collection-title-nav">
        <button
          type="button"
          class="collection-tab-step-btn"
          aria-label="上一个分类"
          @click="onPrevTab"
        >
          <i class="ri-arrow-left-s-line" aria-hidden="true"></i>
        </button>
        <h1 class="collection-title">
          <span class="collection-title__label">{{ activeTitleLabel }}</span>
          <span v-if="activeProgressLine" class="collection-title__progress">{{ activeProgressLine }}</span>
        </h1>
        <button
          type="button"
          class="collection-tab-step-btn"
          aria-label="下一个分类"
          @click="onNextTab"
        >
          <i class="ri-arrow-right-s-line" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <CollectionIconSegmentControl v-model="activeTab" class="collection-tabs" :options="COLLECTION_TABS" />

    <div class="collection-scroll-outer">
      <div
        ref="scrollBodyRef"
        class="collection-body"
        :class="{ 'collection-body--dragging': thumbDragging }"
        @scroll.passive="onScrollBody"
      >
        <div ref="tabPanelRef" class="collection-tab-panel">
          <CollectionTreasureGrid
            v-if="activeTab === 'treasures'"
            :discovered-treasure-ids="career.discoveredTreasureIds"
            @select-treasure="onCollectionTreasureSelect"
          />
          <CollectionSpellGrid
            v-else-if="activeTab === 'spells'"
            :discovered-spell-ids="career.discoveredSpellIds"
            @select-spell="onCollectionSpellSelect"
          />
          <CollectionUpgradeGrid
            v-else-if="activeTab === 'upgrades'"
            :discovered-upgrade-ids="career.discoveredUpgradeIds"
            @select-upgrade="onCollectionUpgradeSelect"
          />
          <CollectionVoucherGrid
            v-else-if="activeTab === 'vouchers'"
            :discovered-voucher-tiers="career.discoveredVoucherTiers"
            @select-voucher="onCollectionVoucherSelect"
          />
          <CollectionMaterialGrid
            v-else-if="activeTab === 'materials'"
            :discovered-material-ids="career.discoveredMaterialIds"
          />
          <CollectionAccessoryTable
            v-else-if="activeTab === 'accessories'"
            :discovered-accessory-ids="career.discoveredAccessoryIds"
          />
          <CollectionAchievementGrid
            v-else-if="activeTab === 'achievements'"
            :unlocked-achievement-ids="career.unlockedAchievementIds"
          />
          <CollectionWordLeaderboardPanel
            v-else-if="activeTab === 'words'"
            :score-records="career.scoreLeaderboard"
            :length-records="career.lengthLeaderboard"
            @select-tile="onLeaderboardTileSelect"
            @select-treasure="onLeaderboardTreasureSelect"
            @sub-tab-change="onWordLeaderboardSubTabChange"
          />
        </div>
      </div>
      <div
        v-show="scrollbarVisible"
        ref="scrollTrackRef"
        class="collection-scroll-track"
        aria-hidden="true"
      >
        <div
          class="collection-scroll-thumb"
          :class="{ 'collection-scroll-thumb--dragging': thumbDragging }"
          :style="thumbStyle"
          @pointerdown="onThumbPointerDown"
        />
      </div>
    </div>

    <TreasureDetailLayer
      v-if="collectionTreasureDetail"
      :treasure="collectionTreasureDetail.treasure"
      mode="collection-preview"
      :origin-rect="collectionTreasureDetail.originRect"
      :shelf-price-kind="collectionTreasureDetail.shelfPriceKind"
      :wallet-amount="0"
      @close="collectionTreasureDetail = null"
    />

    <TileDetailLayer
      v-if="collectionTileDetailPayload"
      :payload="collectionTileDetailPayload"
      :origin-rect="collectionTileDetailOriginRect"
      @close="closeCollectionTileDetail"
    />
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import TreasureDetailLayer from "./TreasureDetailLayer.vue";
import TileDetailLayer from "./TileDetailLayer.vue";
import { buildDiscoveredVoucherDetailTreasure } from "../vouchers/voucherOwnedDisplay.js";
import {
  buildCollectionOwnedTreasurePreview,
  buildCollectionSpellPreview,
  buildCollectionUpgradePreview,
  buildCollectionTreasurePreview,
  buildTileDetailPayloadFromCollectionSnapshot,
  collectionFlyOriginRectFromEl,
} from "../collection/collectionPreview.js";
import CollectionIconSegmentControl from "./CollectionIconSegmentControl.vue";
import CollectionTreasureGrid from "./collection/CollectionTreasureGrid.vue";
import CollectionSpellGrid from "./collection/CollectionSpellGrid.vue";
import CollectionUpgradeGrid from "./collection/CollectionUpgradeGrid.vue";
import CollectionVoucherGrid from "./collection/CollectionVoucherGrid.vue";
import CollectionMaterialGrid from "./collection/CollectionMaterialGrid.vue";
import CollectionAccessoryTable from "./collection/CollectionAccessoryTable.vue";
import CollectionAchievementGrid from "./collection/CollectionAchievementGrid.vue";
import CollectionWordLeaderboardPanel from "./collection/CollectionWordLeaderboardPanel.vue";
import { usePanelScrollbar } from "../composables/usePanelScrollbar.js";
import {
  playCollectionTabEnter,
  prepareCollectionTabEnter,
} from "../collection/collectionTabEnterAnim.js";
import { formatCollectionTabProgressLine } from "../collection/collectionProgress.js";

const props = defineProps({
  career: { type: Object, required: true },
  /** 从主菜单 iris 进入时延后 tab 入场，避免与转场重叠；tab 切换不传 */
  initialEnterDelayMs: { type: Number, default: 0 },
});

defineEmits(["back"]);

const COLLECTION_TABS = Object.freeze([
  { id: "treasures", label: "宝藏", iconClass: "ri-gift-2-line" },
  { id: "spells", label: "法术", iconClass: "ri-magic-line" },
  { id: "upgrades", label: "升级", iconClass: "ri-arrow-up-box-fill" },
  { id: "vouchers", label: "优惠券", iconClass: "ri-coupon-3-line" },
  { id: "materials", label: "材质", iconClass: "ri-stack-line" },
  { id: "accessories", label: "配饰", iconClass: "ri-sparkling-line" },
  { id: "achievements", label: "成就", iconClass: "ri-medal-line" },
  { id: "words", label: "单词榜", iconClass: "ri-file-text-line" },
]);

const TAB_IDS = Object.freeze(COLLECTION_TABS.map((t) => t.id));

const TAB_TITLES = Object.freeze(
  Object.fromEntries(COLLECTION_TABS.map((t) => [t.id, t.label])),
);

const activeTab = ref("treasures");
const tabPanelRef = ref(null);
const tabEnterReady = ref(false);

/** @type {import('vue').Ref<{ treasure: object, originRect: object | null, shelfPriceKind: 'offer' | null } | null>} */
const collectionTreasureDetail = ref(null);
/** @type {import('vue').Ref<Record<string, unknown> | null>} */
const collectionTileDetailPayload = ref(null);
/** @type {import('vue').Ref<{ left: number, top: number, width: number, height: number } | null>} */
const collectionTileDetailOriginRect = ref(null);

const activeTitleLabel = computed(() => TAB_TITLES[activeTab.value] ?? "收藏");

const activeProgressLine = computed(() =>
  formatCollectionTabProgressLine(activeTab.value, props.career),
);

/** @param {number} delta */
function stepTab(delta) {
  const idx = TAB_IDS.indexOf(activeTab.value);
  if (idx < 0) return;
  activeTab.value = TAB_IDS[(idx + delta + TAB_IDS.length) % TAB_IDS.length];
}

function onPrevTab() {
  stepTab(-1);
}

function onNextTab() {
  stepTab(1);
}

const {
  scrollBodyRef,
  scrollTrackRef,
  scrollbarVisible,
  thumbDragging,
  thumbStyle,
  onScrollBody,
  onThumbPointerDown,
  updateScrollbarMetrics,
} = usePanelScrollbar({ thumbColor: "#8a8580", contentRef: tabPanelRef });

async function runTabEnterAnimation(enterDelayMs = 0) {
  await nextTick();
  const root = tabPanelRef.value;
  if (!root) return;
  prepareCollectionTabEnter(root);
  await nextTick();
  playCollectionTabEnter(root, { delayMs: enterDelayMs });
  updateScrollbarMetrics();
}

function closeCollectionPreviews() {
  collectionTreasureDetail.value = null;
  closeCollectionTileDetail();
}

function closeCollectionTileDetail() {
  collectionTileDetailPayload.value = null;
  collectionTileDetailOriginRect.value = null;
}

/**
 * @param {object} treasure
 * @param {HTMLElement | null | undefined} originEl
 * @param {'offer' | null} shelfPriceKind
 */
function openCollectionTreasurePreview(treasure, originEl, shelfPriceKind) {
  if (!treasure) return;
  closeCollectionTileDetail();
  collectionTreasureDetail.value = {
    treasure,
    originRect: collectionFlyOriginRectFromEl(originEl),
    shelfPriceKind,
  };
}

/** @param {{ treasureId?: string, originEl?: HTMLElement | null }} payload */
function onCollectionTreasureSelect(payload) {
  const tid = String(payload?.treasureId ?? "").trim();
  if (!tid) return;
  const treasure = buildCollectionTreasurePreview(tid);
  openCollectionTreasurePreview(treasure, payload.originEl, "offer");
}

/** @param {{ spellId?: string, originEl?: HTMLElement | null }} payload */
function onCollectionSpellSelect(payload) {
  const sid = String(payload?.spellId ?? "").trim();
  if (!sid) return;
  const treasure = buildCollectionSpellPreview(sid);
  openCollectionTreasurePreview(treasure, payload.originEl, "offer");
}

/** @param {{ treasureId?: string, originEl?: HTMLElement | null }} payload */
function onCollectionUpgradeSelect(payload) {
  const tid = String(payload?.treasureId ?? "").trim();
  if (!tid) return;
  const treasure = buildCollectionUpgradePreview(tid);
  openCollectionTreasurePreview(treasure, payload.originEl, "offer");
}

/** @param {{ pairId: string, discoveredTier: number, originEl?: HTMLElement | null }} payload */
function onCollectionVoucherSelect(payload) {
  const pairId = String(payload?.pairId ?? "").trim();
  const tier = Math.max(0, Math.min(2, Math.floor(Number(payload?.discoveredTier) || 0)));
  if (!pairId || tier < 1) return;
  const treasure = buildDiscoveredVoucherDetailTreasure(pairId, /** @type {0 | 1 | 2} */ (tier));
  openCollectionTreasurePreview(treasure, payload.originEl, "offer");
}

/** @param {{ tile: import('../collection/collectionTypes.js').CollectionSubmitTileSnapshot, originEl?: HTMLElement | null }} payload */
function onLeaderboardTileSelect(payload) {
  const tilePayload = buildTileDetailPayloadFromCollectionSnapshot(payload?.tile);
  if (!tilePayload) return;
  collectionTreasureDetail.value = null;
  collectionTileDetailPayload.value = tilePayload;
  collectionTileDetailOriginRect.value = collectionFlyOriginRectFromEl(payload?.originEl);
}

/** @param {{ saved: Record<string, unknown>, originEl?: HTMLElement | null }} payload */
function onLeaderboardTreasureSelect(payload) {
  const treasure = buildCollectionOwnedTreasurePreview(payload?.saved);
  openCollectionTreasurePreview(treasure, payload.originEl, null);
}

function onWordLeaderboardSubTabChange() {
  scrollBodyRef.value?.scrollTo({ top: 0, behavior: "auto" });
  updateScrollbarMetrics();
}

watch(activeTab, async () => {
  closeCollectionPreviews();
  if (!tabEnterReady.value) return;
  scrollBodyRef.value?.scrollTo({ top: 0, behavior: "auto" });
  await runTabEnterAnimation(0);
});

onMounted(async () => {
  await nextTick();
  prepareCollectionTabEnter(tabPanelRef.value);
  tabEnterReady.value = true;
  await runTabEnterAnimation(props.initialEnterDelayMs);
});
</script>

<style scoped>
.collection-page {
  position: relative;
  width: 100%;
  height: 100%;
  --collection-purple: #7b68a8;
  --collection-purple-dark: #554a72;
  --collection-purple-fg: #f9f6f2;
  --collection-padding: calc(30 * var(--rpx));
  --collection-action-btn-size: calc(60 * var(--rpx));
  --collection-title-width: calc(180 * var(--rpx));
  --collection-shop-cell-size: calc(118 * var(--rpx));
  background: var(--card);
  border-radius: calc(12 * var(--rpx));
  box-shadow: var(--shadow);
  padding: var(--collection-padding);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: calc(10 * var(--rpx));
  min-height: 0;
}

.collection-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: calc(72 * var(--rpx));
  min-height: calc(72 * var(--rpx));
  margin-bottom: calc(6 * var(--rpx));
}

.collection-back-btn {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  border: none;
  width: auto;
  height: var(--collection-action-btn-size);
  min-width: calc(96 * var(--rpx));
  padding: 0 calc(24 * var(--rpx)) 0 calc(16 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  background: var(--collection-purple);
  color: var(--collection-purple-fg);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: calc(2 * var(--rpx));
  transition: filter 0.12s ease;
}

.collection-back-btn__icon {
  font-size: calc(28 * var(--rpx));
  line-height: 1;
  flex-shrink: 0;
}

.collection-back-btn__label {
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  line-height: 1;
}

.collection-back-btn:hover {
  filter: brightness(1.08);
}

.collection-back-btn:active {
  filter: brightness(0.92);
}

.collection-back-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid var(--collection-purple);
  outline-offset: calc(2 * var(--rpx));
}

.collection-title-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(10 * var(--rpx));
  max-width: 100%;
}

.collection-tab-step-btn {
  flex-shrink: 0;
  width: var(--collection-action-btn-size);
  height: var(--collection-action-btn-size);
  border: none;
  border-radius: calc(8 * var(--rpx));
  background: var(--collection-purple);
  color: var(--collection-purple-fg);
  font-size: calc(28 * var(--rpx));
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: filter 0.12s ease;
}

.collection-tab-step-btn:hover {
  filter: brightness(1.08);
}

.collection-tab-step-btn:active {
  filter: brightness(0.92);
}

.collection-tab-step-btn:focus-visible {
  outline: calc(2 * var(--rpx)) solid var(--collection-purple);
  outline-offset: calc(2 * var(--rpx));
}

.collection-title {
  margin: 0;
  flex: 0 0 var(--collection-title-width);
  width: var(--collection-title-width);
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: calc(4 * var(--rpx));
  text-align: center;
  box-sizing: border-box;
}

.collection-title__label {
  font-size: calc(40 * var(--rpx));
  font-weight: 800;
  line-height: 1.15;
  color: var(--text-dark, #3c3a32);
}

.collection-title__progress {
  font-size: calc(26 * var(--rpx));
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-muted, #776e65);
}

.collection-tabs {
  flex-shrink: 0;
  margin-top: calc(4 * var(--rpx));
  margin-bottom: calc(6 * var(--rpx));
}

.collection-scroll-outer {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: stretch;
  gap: calc(10 * var(--rpx));
}

.collection-body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  scroll-behavior: smooth;
  box-sizing: border-box;
  padding: calc(2 * var(--rpx)) calc(2 * var(--rpx)) calc(10 * var(--rpx));
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.collection-body--dragging {
  scroll-behavior: auto;
}

.collection-body::-webkit-scrollbar {
  display: none;
}

.collection-scroll-track {
  flex-shrink: 0;
  width: calc(10 * var(--rpx));
  position: relative;
  border-radius: calc(6 * var(--rpx));
  background: rgba(60, 58, 50, 0.08);
  touch-action: none;
  user-select: none;
}

.collection-scroll-thumb {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  border-radius: calc(6 * var(--rpx));
  box-shadow: 0 calc(1 * var(--rpx)) calc(3 * var(--rpx)) rgba(0, 0, 0, 0.12);
  cursor: grab;
  touch-action: none;
}

.collection-scroll-thumb--dragging,
.collection-scroll-thumb:active {
  cursor: grabbing;
  filter: brightness(1.06);
}

.collection-tab-panel {
  min-height: 0;
}

.collection-empty-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(240 * var(--rpx));
  color: var(--text-muted, #776e65);
  font-size: calc(28 * var(--rpx));
}

.collection-empty-tab p {
  margin: 0;
}
</style>

<style>
.collection-page .collection-grid--shop-cells {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-content: flex-start;
  row-gap: calc(18 * var(--rpx));
  column-gap: calc(16 * var(--rpx));
}

.collection-page .collection-grid--upgrades {
  justify-content: center;
}

.collection-page .collection-upgrade-section__title {
  color: var(--text-dark, #3c3a32);
}

.collection-page .shop-treasure-frame--length-offer .shop-upgrade-length,
.collection-page .shop-treasure-frame--pack-rarity .shop-pack-rarity-caption {
  color: var(--text-dark, #3c3a32);
}

.collection-page .shop-treasure-frame--length-offer .shop-treasure-emoji--icon,
.collection-page .shop-treasure-frame--pack-rarity .shop-treasure-emoji--icon {
  color: var(--text-dark, #3c3a32);
}

.collection-page .collection-grid--vouchers {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  justify-items: stretch;
  align-content: flex-start;
  row-gap: calc(32 * var(--rpx));
  column-gap: calc(16 * var(--rpx));
  padding-top: calc(32 * var(--rpx));
}

.collection-page .collection-grid--vouchers .shop-treasure-product {
  width: 100%;
  max-width: none;
  flex: 1 1 auto;
}

.collection-page .collection-grid--vouchers .shop-treasure-visual {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.collection-page .collection-grid--vouchers .voucher-stamp-stack {
  width: 100%;
  max-width: var(--collection-shop-cell-size);
  margin: 0 auto;
}

.collection-page .collection-grid--vouchers .voucher-stamp {
  width: 100%;
  max-width: var(--collection-shop-cell-size);
}

.collection-page .collection-grid--vouchers .shop-treasure-price {
  width: 100%;
  max-width: var(--collection-shop-cell-size);
  align-self: center;
  box-sizing: border-box;
}

.collection-page .collection-grid--vouchers .voucher-stamp-stack--stacked {
  height: var(--collection-shop-cell-size);
}

.collection-page .collection-grid--vouchers .voucher-stamp__frame {
  height: var(--collection-shop-cell-size);
}

.collection-page .shop-treasure-product {
  position: relative;
  width: var(--collection-shop-cell-size);
  flex: 0 0 var(--collection-shop-cell-size);
  max-width: var(--collection-shop-cell-size);
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow: visible;
}

.collection-page .shop-treasure-frame,
.collection-page .voucher-stamp__frame {
  height: var(--collection-shop-cell-size);
}

.collection-page .shop-treasure-visual {
  width: 100%;
}

.collection-page .voucher-stamp {
  width: 100%;
}

.collection-page .voucher-stamp-stack {
  width: 100%;
}

.collection-page .collection-leaderboard-treasure-hit .treasure-slot {
  width: calc(72 * var(--rpx));
  height: calc(72 * var(--rpx));
}

.collection-page .collection-material-tile.grid-tile {
  width: calc(100 * var(--rpx));
  height: calc(100 * var(--rpx));
  cursor: default;
}
</style>
