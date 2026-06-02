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
      <div class="collection-leaderboard-tiles" role="group" :aria-label="record.word">
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
      <div v-if="hydratedTreasures(record).length" class="collection-leaderboard-treasures">
        <button
          v-for="(slot, slotIx) in hydratedTreasures(record)"
          :key="`${index}-treasure-${slotIx}`"
          type="button"
          class="collection-leaderboard-treasure-hit"
          :aria-label="`预览宝藏 ${slot?.name ?? ''}`"
          @click="onTreasureClick(slot, $event)"
        >
          <TreasureSlot
            :treasure="slot"
            :gem-class="gemClassForTreasureRarity(String(slot?.rarity ?? 'rare'))"
          />
        </button>
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

/** @param {import('../../collection/collectionTypes.js').CollectionSubmitTileSnapshot} tile */
function displayLetter(tile) {
  return String(tile.letter ?? "");
}

/** @param {import('../../collection/collectionTypes.js').CollectionWordRecord} record */
function hydratedTreasures(record) {
  return (record.ownedTreasures ?? [])
    .map((saved) => buildOwnedTreasureSlot(saved))
    .filter(Boolean);
}

/** @param {import('../../collection/collectionTypes.js').CollectionSubmitTileSnapshot} tile @param {MouseEvent} event */
function onTileClick(tile, event) {
  const el = event.currentTarget;
  emit("select-tile", {
    tile,
    originEl: el instanceof HTMLElement ? el : null,
  });
}

/** @param {Record<string, unknown>} slot @param {MouseEvent} event */
function onTreasureClick(slot, event) {
  const el = event.currentTarget;
  emit("select-treasure", {
    saved: slot,
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
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: calc(4 * var(--rpx));
  margin-bottom: calc(10 * var(--rpx));
}

.collection-leaderboard-tile-hit {
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  border-radius: calc(4 * var(--rpx));
  line-height: 0;
  transition: filter 0.1s ease;
}

.collection-leaderboard-tile-hit:hover {
  filter: brightness(1.04);
}

.collection-leaderboard-tile-hit:active {
  filter: brightness(0.96);
}

.collection-leaderboard-tile {
  width: calc(64 * var(--rpx));
  height: calc(64 * var(--rpx));
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
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: calc(10 * var(--rpx));
}

.collection-leaderboard-treasure-hit {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: calc(72 * var(--rpx));
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
</style>
