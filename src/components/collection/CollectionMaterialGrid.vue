<template>
  <div class="collection-grid collection-grid--materials">
    <article
      v-for="item in entries"
      :key="item.id"
      class="collection-material-card"
      :class="{ 'collection-material-card--unknown': !item.discovered }"
    >
      <div class="collection-material-tile-wrap">
        <LetterTile
          v-if="item.discovered"
          variant="grid"
          class="collection-material-tile shop-shelf-letter-tile"
          letter="·"
          hide-letter
          hide-rarity-gem
          :material-id="item.id"
        />
        <div v-else class="collection-material-tile collection-material-tile--unknown" aria-hidden="true">
          <span class="collection-material-unknown__mark">?</span>
        </div>
      </div>
      <h3 class="collection-material-title">{{ item.title }}</h3>
      <p class="collection-material-desc treasure-detail-desc-body-text">
        <TreasureDescSegmentList v-if="item.discovered" :segments="item.segments" />
        <span v-else>{{ unknownLabel }}</span>
      </p>
    </article>
  </div>
</template>

<script setup>
import { computed } from "vue";
import LetterTile from "../LetterTile.vue";
import TreasureDescSegmentList from "../TreasureDescSegmentList.vue";
import { getTileMaterialBlockTitle } from "../../game/gameConceptCopy.js";
import {
  COLLECTION_MATERIAL_DISPLAY_ORDER,
  COLLECTION_MATERIAL_RICH_SEGMENTS,
} from "../../collection/collectionMaterialRichDesc.js";
import { COLLECTION_UNKNOWN_LABEL } from "../../collection/collectionDisplayUtils.js";

const props = defineProps({
  discoveredMaterialIds: { type: Array, default: () => [] },
});

const unknownLabel = COLLECTION_UNKNOWN_LABEL;

const discoveredSet = computed(() => new Set((props.discoveredMaterialIds ?? []).map(String)));

const entries = computed(() =>
  COLLECTION_MATERIAL_DISPLAY_ORDER.map((id) => {
    const discovered = discoveredSet.value.has(id);
    return {
      id,
      discovered,
      title: discovered ? getTileMaterialBlockTitle(id) : COLLECTION_UNKNOWN_LABEL,
      segments: COLLECTION_MATERIAL_RICH_SEGMENTS[id] ?? [{ type: "text", v: "" }],
    };
  }),
);
</script>

<style scoped>
.collection-grid--materials {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-rows: 1fr;
  gap: calc(16 * var(--rpx));
}

.collection-material-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  min-height: calc(232 * var(--rpx));
  height: 100%;
  padding: calc(16 * var(--rpx)) calc(12 * var(--rpx)) calc(18 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  background: #353129;
  box-sizing: border-box;
}

.collection-material-tile-wrap {
  display: flex;
  justify-content: center;
  width: 100%;
  flex-shrink: 0;
  margin-bottom: calc(18 * var(--rpx));
}

.collection-material-tile {
  width: calc(96 * var(--rpx));
  height: calc(96 * var(--rpx));
  flex-shrink: 0;
}

.collection-material-tile--unknown {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(12 * var(--rpx));
  background: rgba(249, 246, 242, 0.12);
  box-shadow: inset 0 0 0 calc(2 * var(--rpx)) rgba(249, 246, 242, 0.08);
}

.collection-material-unknown__mark {
  font-size: calc(40 * var(--rpx));
  font-weight: 700;
  color: rgba(249, 246, 242, 0.45);
  line-height: 1;
}

.collection-material-title {
  margin: 0 0 calc(8 * var(--rpx));
  font-size: calc(28 * var(--rpx));
  font-weight: 800;
  color: #f9f6f2;
  text-align: center;
  flex-shrink: 0;
}

.collection-material-card--unknown .collection-material-title {
  color: rgba(249, 246, 242, 0.45);
}

.collection-material-desc {
  margin: 0;
  width: 100%;
  flex: 1 1 auto;
  font-size: calc(24 * var(--rpx));
  line-height: 1.5;
  color: rgba(249, 246, 242, 0.82);
  text-align: center;
  text-wrap: balance;
}

.collection-material-card--unknown .collection-material-desc {
  color: rgba(249, 246, 242, 0.45);
}
</style>
