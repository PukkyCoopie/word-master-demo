<template>
  <div class="collection-leaderboard">
    <p v-if="!sortedRecords.length" class="collection-leaderboard__empty">暂无记录</p>
    <article
      v-for="(record, index) in sortedRecords"
      :key="`${record.word}-${record.recordedAt}-${index}`"
      class="collection-leaderboard-entry"
    >
      <div v-if="sortKey === 'score'" class="collection-leaderboard-meta">
        <span class="collection-leaderboard-stat">{{ record.score.toLocaleString("zh-CN") }}</span>
      </div>
      <div
        class="collection-leaderboard-tiles"
        role="group"
        :aria-label="record.word"
        :style="tileRowStyle(record.tiles.length)"
      >
        <button
          v-for="(tile, tileIx) in record.tiles"
          :key="`${index}-${tileIx}-${tile.letter}`"
          type="button"
          class="collection-leaderboard-tile-hit"
          :aria-label="`预览字母 ${displayLetter(tile)}`"
          @click="onTileClick(tile, $event)"
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
        v-if="hasTreasureSnapshot(record)"
        class="collection-leaderboard-treasures"
        :style="treasureRowStyle(record.ownedTreasures.length)"
      >
        <template v-for="(slot, slotIx) in hydratedTreasures(record)" :key="`${index}-treasure-${slotIx}`">
          <button
            v-if="slot"
            type="button"
            class="collection-leaderboard-treasure-hit"
            :aria-label="`预览宝藏 ${slot?.name ?? ''}`"
            @click="onTreasureClick(record, slotIx, $event)"
          >
            <TreasureSlot
              :treasure="slot"
              :gem-class="gemClassForTreasureRarity(String(slot?.rarity ?? 'rare'))"
            />
          </button>
          <div v-else class="collection-leaderboard-treasure-empty" aria-hidden="true">
            <TreasureSlot :treasure="null" />
          </div>
        </template>
      </div>
    </article>
  </div>
</template>

<script setup>
import { computed } from "vue";
import LetterTile from "../LetterTile.vue";
import TreasureSlot from "../TreasureSlot.vue";
import { gemClassForTreasureRarity } from "../../collection/collectionDisplayUtils.js";
import { buildOwnedTreasureSlot } from "../../treasures/ownedTreasureSlot.js";

/** 默认字母块尺寸（设计 rpx）；超出单行时按行宽等比缩小 */
const LEADERBOARD_TILE_BASE = 88;
const LEADERBOARD_TILE_GAP = 6;
/** 收藏页条目内容区可用宽度（750 − 内外边距 − 条目 padding） */
const LEADERBOARD_ROW_MAX_W = 662;

const LEADERBOARD_TREASURE_BASE = 72;
const LEADERBOARD_TREASURE_GAP = 10;

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

/** @param {number} count */
function rowFitScale(count, tileBase, gap, maxW) {
  const n = Math.max(1, Math.floor(Number(count) || 0));
  const total = n * tileBase + (n - 1) * gap;
  return Math.min(1, maxW / total);
}

/** @param {number} tileCount */
function tileRowStyle(tileCount) {
  const scale = rowFitScale(tileCount, LEADERBOARD_TILE_BASE, LEADERBOARD_TILE_GAP, LEADERBOARD_ROW_MAX_W);
  return { "--leaderboard-tile-scale": String(scale) };
}

/** @param {number} slotCount */
function treasureRowStyle(slotCount) {
  const scale = rowFitScale(slotCount, LEADERBOARD_TREASURE_BASE, LEADERBOARD_TREASURE_GAP, LEADERBOARD_ROW_MAX_W);
  return { "--leaderboard-treasure-scale": String(scale) };
}

/** @param {import('../../collection/collectionTypes.js').CollectionSubmitTileSnapshot} tile */
function displayLetter(tile) {
  return String(tile.letter ?? "");
}

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record */
function hasTreasureSnapshot(record) {
  return Array.isArray(record.ownedTreasures) && record.ownedTreasures.length > 0;
}

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record */
function hydratedTreasures(record) {
  return (record.ownedTreasures ?? []).map((saved) =>
    saved ? buildOwnedTreasureSlot(saved) : null,
  );
}

/** @param {import('../../collection/collectionTypes.js').CollectionSubmitTileSnapshot} tile @param {MouseEvent} event */
function onTileClick(tile, event) {
  const el = event.currentTarget;
  emit("select-tile", {
    tile,
    originEl: el instanceof HTMLElement ? el : null,
  });
}

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record @param {number} slotIx @param {MouseEvent} event */
function onTreasureClick(record, slotIx, event) {
  const saved = record.ownedTreasures?.[slotIx];
  if (!saved) return;
  const el = event.currentTarget;
  emit("select-treasure", {
    saved,
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
  padding: calc(14 * var(--rpx));
  border-radius: calc(10 * var(--rpx));
  background: rgba(0, 0, 0, 0.04);
}

.collection-leaderboard-tiles {
  --leaderboard-tile-scale: 1;
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: calc(6 * var(--rpx) * var(--leaderboard-tile-scale, 1));
  width: 100%;
  min-width: 0;
  margin-bottom: calc(10 * var(--rpx));
  overflow: hidden;
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
  --shop-shelf-cell-size: calc(88 * var(--rpx) * var(--leaderboard-tile-scale, 1));
  width: var(--shop-shelf-cell-size);
  height: var(--shop-shelf-cell-size);
  flex: 0 0 auto;
  pointer-events: none;
}

.collection-leaderboard-meta {
  display: flex;
  justify-content: center;
  margin: 0 0 calc(10 * var(--rpx));
}

.collection-leaderboard-stat {
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--text-dark, #3c3a32);
}

.collection-leaderboard-treasures {
  --leaderboard-treasure-scale: 1;
  display: flex;
  flex-wrap: nowrap;
  justify-content: center;
  align-items: center;
  gap: calc(10 * var(--rpx) * var(--leaderboard-treasure-scale, 1));
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.collection-leaderboard-treasure-hit,
.collection-leaderboard-treasure-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 auto;
  width: calc(72 * var(--rpx) * var(--leaderboard-treasure-scale, 1));
}

.collection-leaderboard-treasure-hit {
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

.collection-leaderboard-treasure-hit :deep(.treasure-slot),
.collection-leaderboard-treasure-empty :deep(.treasure-slot) {
  width: calc(72 * var(--rpx) * var(--leaderboard-treasure-scale, 1));
  height: calc(72 * var(--rpx) * var(--leaderboard-treasure-scale, 1));
}
</style>
