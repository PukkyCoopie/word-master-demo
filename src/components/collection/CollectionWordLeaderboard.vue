<template>
  <div ref="leaderboardRootRef" class="collection-leaderboard">
    <p v-if="!sortedRecords.length" class="collection-leaderboard__empty">暂无记录</p>
    <article
      v-for="(record, index) in sortedRecords"
      :key="`${record.word}-${record.recordedAt}-${index}`"
      class="collection-leaderboard-entry"
    >
      <header class="collection-leaderboard-entry__head">
        <span class="collection-leaderboard-stat">{{ entryStatLabel(record) }}</span>
        <h3 class="collection-leaderboard-word">{{ record.word }}</h3>
        <span class="collection-leaderboard-entry__head-spacer" aria-hidden="true">{{
          entryStatLabel(record)
        }}</span>
      </header>
      <div
        class="collection-leaderboard-composition"
        :style="compositionStyle(record)"
      >
        <div
          class="collection-leaderboard-tiles"
          role="group"
          :aria-label="record.word"
        >
          <button
            v-for="(tile, tileIx) in record.tiles"
            :key="`${index}-${tileIx}-${tile.letter}`"
            type="button"
            class="collection-leaderboard-tile-hit"
            :aria-label="`预览字母 ${displayLetter(tile)}`"
            @click="onTileClick(tile, tileIx, record, $event)"
          >
            <LetterTile
              variant="grid"
              class="collection-leaderboard-tile shop-shelf-letter-tile"
              :material-animate="false"
              :letter="displayLetter(tile)"
              :rarity="tile.rarity"
              :material-id="tile.materialId"
              :tile-score-bonus="tile.tileScoreBonus"
              :tile-mult-bonus="tile.letterMultBonus"
              :accessory-id="tile.accessoryId"
              :treasure-accessory-id="tile.treasureAccessoryId"
              :vowel-ghost-prev="tile.vowelGhostPrev"
              :vowel-ghost-next="tile.vowelGhostNext"
            />
          </button>
        </div>
        <div
          v-if="filledTreasureEntries(record).length"
          class="collection-leaderboard-composition__sep"
          aria-hidden="true"
        />
        <div
          v-if="filledTreasureEntries(record).length"
          class="collection-leaderboard-treasures"
        >
          <button
            v-for="entry in filledTreasureEntries(record)"
            :key="`${index}-treasure-${entry.slotIx}`"
            type="button"
            class="collection-leaderboard-treasure-hit"
            :aria-label="`预览宝藏 ${entry.slot?.name ?? ''}`"
            @click="onTreasureClick(record, entry.slotIx, $event)"
          >
            <TreasureSlot
              :treasure="entry.slot"
              :gem-class="gemClassForTreasureRarity(String(entry.slot?.rarity ?? 'rare'))"
            />
          </button>
        </div>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import LetterTile from "../LetterTile.vue";
import TreasureSlot from "../TreasureSlot.vue";
import { gemClassForTreasureRarity } from "../../collection/collectionDisplayUtils.js";
import { buildOwnedTreasureSlot } from "../../treasures/ownedTreasureSlot.js";

/** 默认字母块尺寸（设计 rpx）；超出单行时按行宽等比缩小 */
const LEADERBOARD_TILE_BASE = 80;
const LEADERBOARD_TILE_GAP = 3;
/** 宝藏相对字母块的比例（同组缩放） */
const LEADERBOARD_TREASURE_TO_TILE = 0.78;
/** 条目左右 padding（12 × 2）+ 组合区内边距（10 × 2） */
const LEADERBOARD_ENTRY_PAD_RPX = 44;
/** 两侧留白，避免阴影 / 亚像素取整贴边被裁切 */
const LEADERBOARD_ROW_SAFETY_RPX = 10;

const leaderboardRootRef = ref(null);
/** @type {import('vue').Ref<number>} 实测可用行宽（设计 rpx） */
const rowMaxDesignW = ref(640);

function readRpx() {
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--rpx").trim()) || 1;
}

function syncRowMaxDesignW() {
  const root = leaderboardRootRef.value;
  if (!root) return;
  const rpx = readRpx();
  const contentDesignW = root.clientWidth / rpx;
  rowMaxDesignW.value = Math.max(
    120,
    contentDesignW - LEADERBOARD_ENTRY_PAD_RPX - LEADERBOARD_ROW_SAFETY_RPX,
  );
}

/** @type {ResizeObserver | null} */
let rowWidthObserver = null;

onMounted(() => {
  syncRowMaxDesignW();
  const root = leaderboardRootRef.value;
  if (!root || typeof ResizeObserver === "undefined") return;
  rowWidthObserver = new ResizeObserver(() => syncRowMaxDesignW());
  rowWidthObserver.observe(root);
});

onUnmounted(() => {
  rowWidthObserver?.disconnect();
  rowWidthObserver = null;
});

const props = defineProps({
  records: { type: Array, default: () => [] },
  sortKey: {
    type: String,
    default: "score",
    validator: (v) => v === "score" || v === "length",
  },
});

const emit = defineEmits(["select-tile", "select-treasure"]);

const sortedRecords = computed(() => {
  const list = [...(props.records ?? [])];
  list.sort((a, b) => {
    const primaryA = props.sortKey === "score" ? a.score : a.length;
    const primaryB = props.sortKey === "score" ? b.score : b.length;
    if (primaryB !== primaryA) return primaryB - primaryA;
    if (b.score !== a.score) return b.score - a.score;
    return (b.recordedAt || 0) - (a.recordedAt || 0);
  });
  return list;
});

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record */
function entryStatLabel(record) {
  if (props.sortKey === "score") {
    return record.score.toLocaleString("zh-CN");
  }
  return `${record.length} 字母`;
}

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record */
function filledTreasureEntries(record) {
  return (record.ownedTreasures ?? [])
    .map((saved, slotIx) =>
      saved ? { slotIx, slot: buildOwnedTreasureSlot(saved) } : null,
    )
    .filter(Boolean);
}

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record */
function compositionStyle(record) {
  const tileCount = Math.max(1, record.tiles?.length ?? 0);
  const treasureCount = filledTreasureEntries(record).length;
  const treasureBase = LEADERBOARD_TILE_BASE * LEADERBOARD_TREASURE_TO_TILE;
  const treasureGap = LEADERBOARD_TILE_GAP;
  const tilesWidth = tileCount * LEADERBOARD_TILE_BASE + (tileCount - 1) * LEADERBOARD_TILE_GAP;
  const treasuresWidth =
    treasureCount > 0
      ? treasureCount * treasureBase + (treasureCount - 1) * treasureGap
      : 0;
  const combinedWidth =
    treasureCount > 0
      ? Math.max(tilesWidth, treasuresWidth)
      : tilesWidth;
  const scale = combinedWidth <= rowMaxDesignW.value ? 1 : rowMaxDesignW.value / combinedWidth;
  return {
    "--leaderboard-tile-scale": String(scale),
    "--leaderboard-treasure-scale": String(scale),
  };
}

/** @param {import('../../collection/collectionTypes.js').CollectionSubmitTileSnapshot} tile */
function displayLetter(tile) {
  return String(tile.letter ?? "");
}

/** @param {import('../../collection/collectionTypes.js').CollectionSubmitTileSnapshot} tile @param {number} tileIx @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record @param {MouseEvent} event */
function onTileClick(tile, tileIx, record, event) {
  const el = event.currentTarget;
  emit("select-tile", {
    tile,
    tiles: record.tiles,
    tileIndex: tileIx,
    originEl: el instanceof HTMLElement ? el : null,
  });
}

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record */
function buildTreasureNavItems(record) {
  return (record.ownedTreasures ?? [])
    .map((saved) => (saved ? { saved } : null))
    .filter(Boolean);
}

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record @param {number} slotIx @param {MouseEvent} event */
function onTreasureClick(record, slotIx, event) {
  const saved = record.ownedTreasures?.[slotIx];
  if (!saved) return;
  const el = event.currentTarget;
  emit("select-treasure", {
    saved,
    treasureNavItems: buildTreasureNavItems(record),
    originEl: el instanceof HTMLElement ? el : null,
  });
}
</script>

<style scoped>
.collection-leaderboard {
  display: flex;
  flex-direction: column;
  gap: calc(20 * var(--rpx));
}

.collection-leaderboard__empty {
  margin: calc(40 * var(--rpx)) 0;
  text-align: center;
  color: var(--text-muted, #776e65);
  font-size: calc(28 * var(--rpx));
}

.collection-leaderboard-entry {
  padding: calc(12 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: rgba(0, 0, 0, 0.04);
}

.collection-leaderboard-entry__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: baseline;
  gap: calc(8 * var(--rpx));
  margin: 0 0 calc(10 * var(--rpx));
  padding: 0 calc(2 * var(--rpx));
}

.collection-leaderboard-entry__head-spacer {
  visibility: hidden;
  justify-self: end;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  pointer-events: none;
}

.collection-leaderboard-word {
  grid-column: 2;
  min-width: 0;
  margin: 0;
  text-align: center;
  font-size: calc(28 * var(--rpx));
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.03em;
  color: var(--text-dark, #3c3a32);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collection-leaderboard-composition {
  --leaderboard-tile-scale: 1;
  --leaderboard-treasure-scale: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(8 * var(--rpx) * var(--leaderboard-tile-scale, 1));
  padding: calc(12 * var(--rpx)) calc(10 * var(--rpx));
  border-radius: calc(8 * var(--rpx));
  background: rgba(255, 255, 255, 0.55);
}

.collection-leaderboard-composition__sep {
  flex: 0 0 auto;
  width: min(100%, calc(180 * var(--rpx) * var(--leaderboard-tile-scale, 1)));
  height: calc(1 * var(--rpx));
  background: rgba(60, 58, 50, 0.12);
}

.collection-leaderboard-tiles {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: calc(3 * var(--rpx) * var(--leaderboard-tile-scale, 1));
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.collection-leaderboard-tile-hit {
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  border-radius: calc(4 * var(--rpx));
  line-height: 0;
  flex: 0 0 auto;
  transition: filter 0.1s ease;
}

.collection-leaderboard-tile-hit:hover {
  filter: brightness(1.04);
}

.collection-leaderboard-tile-hit:active {
  filter: brightness(0.96);
}

.collection-leaderboard-tile {
  --shop-shelf-cell-size: calc(80 * var(--rpx) * var(--leaderboard-tile-scale, 1));
  width: var(--shop-shelf-cell-size);
  height: var(--shop-shelf-cell-size);
  flex: 0 0 auto;
  pointer-events: none;
}

.collection-leaderboard-stat {
  justify-self: start;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted, #776e65);
  white-space: nowrap;
}

.collection-leaderboard-treasures {
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: calc(3 * var(--rpx) * var(--leaderboard-treasure-scale, 1));
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.collection-leaderboard-treasure-hit {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
  width: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1));
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  border-radius: calc(4 * var(--rpx));
  transition: filter 0.1s ease;
}

.collection-leaderboard-treasure-hit:hover {
  filter: brightness(1.04);
}

.collection-leaderboard-treasure-hit:active {
  filter: brightness(0.96);
}

.collection-leaderboard-treasure-hit :deep(.treasure-slot) {
  flex: 0 0 auto;
  width: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1));
  height: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1));
  max-width: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1));
}

.collection-leaderboard-treasure-hit :deep(.treasure-slot.filled) {
  container-type: size;
  container-name: treasure-cell;
}

.collection-leaderboard-treasure-hit :deep(.treasure-slot-emoji) {
  font-size: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 42 / 108);
  line-height: 1;
}

.collection-leaderboard-treasure-hit :deep(.treasure-slot.filled .letter-gem) {
  left: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 6 / 108);
  bottom: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 6 / 108);
  width: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 14 / 108);
  height: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 14 / 108);
}

.collection-leaderboard-treasure-hit :deep(.treasure-slot.filled .treasure-accessory-chip) {
  top: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 4 / 108);
  right: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 4 / 108);
  width: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 22 / 108);
  height: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 22 / 108);
  border-radius: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 5 / 108);
}

.collection-leaderboard-treasure-hit :deep(.treasure-slot.filled .treasure-accessory-chip-icon) {
  font-size: calc(80 * var(--rpx) * 0.78 * var(--leaderboard-treasure-scale, 1) * 13 / 108);
}
</style>
