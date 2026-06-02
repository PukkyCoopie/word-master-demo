<template>
  <div class="collection-leaderboard">
    <p v-if="!sortedRecords.length" class="collection-leaderboard__empty">暂无记录</p>
    <article v-for="(record, index) in sortedRecords" :key="`${record.word}-${record.recordedAt}-${index}`" class="collection-leaderboard-entry">
      <div class="collection-leaderboard-tiles" role="img" :aria-label="record.word">
        <LetterTile
          v-for="(tile, tileIx) in record.tiles"
          :key="`${index}-${tileIx}-${tile.letter}`"
          variant="grid"
          class="collection-leaderboard-tile"
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
      </div>
      <div class="collection-leaderboard-meta">
        <span class="collection-leaderboard-word">{{ record.word.toUpperCase() }}</span>
        <span class="collection-leaderboard-stat">分数 {{ record.score.toLocaleString("zh-CN") }}</span>
        <span class="collection-leaderboard-stat">长度 {{ record.length }}</span>
      </div>
      <div v-if="hydratedTreasures(record).length" class="collection-leaderboard-treasures">
        <div
          v-for="(slot, slotIx) in hydratedTreasures(record)"
          :key="`${index}-treasure-${slotIx}`"
          class="collection-leaderboard-treasure-item"
        >
          <TreasureSlot
            :treasure="slot"
            :gem-class="gemClassForTreasureRarity(String(slot?.rarity ?? 'rare'))"
          />
          <span class="collection-leaderboard-treasure-name">{{ slot?.name ?? "" }}</span>
        </div>
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
  gap: calc(6 * var(--rpx));
  margin-bottom: calc(10 * var(--rpx));
}

.collection-leaderboard-tile {
  width: calc(64 * var(--rpx));
  height: calc(64 * var(--rpx));
  flex: 0 0 auto;
}

.collection-leaderboard-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: calc(8 * var(--rpx)) calc(16 * var(--rpx));
  margin-bottom: calc(10 * var(--rpx));
}

.collection-leaderboard-word {
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  color: var(--text-dark, #3c3a32);
}

.collection-leaderboard-stat {
  font-size: calc(24 * var(--rpx));
  color: var(--text-muted, #776e65);
}

.collection-leaderboard-treasures {
  display: flex;
  flex-wrap: wrap;
  gap: calc(10 * var(--rpx));
}

.collection-leaderboard-treasure-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(4 * var(--rpx));
  width: calc(72 * var(--rpx));
}

.collection-leaderboard-treasure-name {
  font-size: calc(20 * var(--rpx));
  line-height: 1.2;
  text-align: center;
  color: var(--text-dark, #3c3a32);
  word-break: break-word;
}
</style>
