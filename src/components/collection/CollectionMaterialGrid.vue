<template>
  <div class="collection-material-list">
    <div
      v-for="item in entries"
      :key="item.id"
      class="collection-material-row"
      :class="{ 'collection-material-row--unknown': !item.discovered }"
    >
      <div class="collection-material-cell collection-material-cell--tile">
        <div class="collection-material-tile-wrap">
          <CollectionNewMark :show="item.showNewMark" />
          <LetterTile
            v-if="item.discovered"
            variant="grid"
            class="collection-material-tile shop-shelf-letter-tile"
            letter="·"
            hide-letter
            hide-rarity-gem
            :material-id="item.id"
          />
          <div
            v-else
            class="collection-material-tile collection-material-tile--unknown"
            aria-hidden="true"
          >
            <span class="collection-material-unknown__mark">?</span>
          </div>
        </div>
      </div>
      <div class="collection-material-cell collection-material-cell--text">
        <div class="collection-material-text">
          <h3 class="collection-material-title">{{ item.title }}</h3>
          <p class="collection-material-desc">
            <TreasureDescSegmentList v-if="item.discovered" :segments="item.segments" />
            <span v-else>{{ unknownLabel }}</span>
          </p>
        </div>
      </div>
    </div>
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
import { collectionNewKeyForMaterial } from "../../collection/collectionNewDiscoveries.js";
import CollectionNewMark from "./CollectionNewMark.vue";

const props = defineProps({
  discoveredMaterialIds: { type: Array, default: () => [] },
  collectionNewKeys: { type: Object, default: () => new Set() },
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
      showNewMark: discovered && props.collectionNewKeys.has(collectionNewKeyForMaterial(id)),
    };
  }),
);
</script>

<style scoped>
.collection-material-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  --collection-material-row-bg-dark: rgba(24, 22, 19, 0.98);
  --collection-material-row-bg-light: rgba(36, 34, 30, 0.96);
  --collection-material-fg: rgba(248, 244, 238, 0.9);
  --collection-material-fg-strong: rgba(252, 248, 242, 0.98);
  --collection-material-fg-muted: rgba(248, 244, 238, 0.45);
  border-radius: calc(12 * var(--rpx));
  overflow: hidden;
  border: calc(1 * var(--rpx)) solid rgba(255, 255, 255, 0.09);
  box-shadow: inset 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.05);
  background: var(--collection-material-row-bg-dark);
}

.collection-material-row {
  display: flex;
  align-items: stretch;
  width: 100%;
  box-sizing: border-box;
}

.collection-material-row:nth-child(odd) {
  background: var(--collection-material-row-bg-dark);
}

.collection-material-row:nth-child(even) {
  background: var(--collection-material-row-bg-light);
}

.collection-material-row:not(:first-child) {
  box-shadow: inset 0 calc(1 * var(--rpx)) 0 rgba(255, 255, 255, 0.05);
}

.collection-material-row--unknown {
  opacity: 0.62;
}

.collection-material-row .collection-material-cell {
  box-sizing: border-box;
  min-width: 0;
}

.collection-material-row .collection-material-cell--tile {
  flex: 0 0 calc(136 * var(--rpx));
  width: calc(136 * var(--rpx));
  padding: calc(18 * var(--rpx)) calc(16 * var(--rpx));
  display: flex;
  align-items: center;
  justify-content: center;
}

.collection-material-row .collection-material-cell--text {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  padding: calc(18 * var(--rpx)) calc(18 * var(--rpx)) calc(18 * var(--rpx)) calc(14 * var(--rpx));
}

.collection-material-row .collection-material-cell--text::before {
  content: "";
  position: absolute;
  left: 0;
  top: 18%;
  bottom: 18%;
  width: calc(1 * var(--rpx));
  background: rgba(255, 255, 255, 0.07);
  pointer-events: none;
}

.collection-material-tile-wrap {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  cursor: default;
}

.collection-material-tile {
  width: calc(100 * var(--rpx));
  height: calc(100 * var(--rpx));
  flex-shrink: 0;
  pointer-events: none;
  cursor: default;
}

.collection-material-tile--unknown {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(14 * var(--rpx));
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 0 calc(2 * var(--rpx)) rgba(255, 255, 255, 0.06);
}

.collection-material-unknown__mark {
  font-size: calc(44 * var(--rpx));
  font-weight: 700;
  color: var(--collection-material-fg-muted);
  line-height: 1;
}

.collection-material-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(6 * var(--rpx));
  text-align: left;
}

.collection-material-title {
  margin: 0;
  font-size: calc(28 * var(--rpx));
  font-weight: 800;
  line-height: 1.25;
  color: var(--collection-material-fg-strong);
}

.collection-material-row--unknown .collection-material-title {
  color: var(--collection-material-fg-muted);
}

.collection-material-desc {
  margin: 0;
  width: 100%;
  font-size: calc(24 * var(--rpx));
  line-height: 1.55;
  color: var(--collection-material-fg);
  text-align: left;
  word-break: break-word;
}

.collection-material-row--unknown .collection-material-desc {
  color: var(--collection-material-fg-muted);
}

.collection-material-desc :deep(.td-desc-chip) {
  display: inline;
  margin: 0 0.14em;
  font-weight: 400;
  white-space: nowrap;
}

.collection-material-desc :deep(.td-desc-gain),
.collection-material-desc :deep(.td-desc-gain-block) {
  font-weight: 900;
  color: var(--collection-material-fg-strong);
}

.collection-material-desc :deep(.td-desc-mult) {
  color: var(--treasure-desc-mult);
}

.collection-material-desc :deep(.td-desc-mult--times) {
  background: var(--mult-accent);
  color: #fff;
  border-radius: calc(6 * var(--rpx));
  padding: calc(3 * var(--rpx)) calc(10 * var(--rpx));
  box-shadow: 0 calc(1 * var(--rpx)) calc(4 * var(--rpx)) rgba(0, 0, 0, 0.2);
}

.collection-material-desc :deep(.td-desc-score) {
  color: var(--treasure-desc-score);
}

.collection-material-desc :deep(.td-desc-money) {
  color: var(--shop-reroll-price-accent, #ffe566);
  font-weight: 400;
}

.collection-material-desc :deep(.td-desc-prob) {
  color: var(--treasure-desc-prob);
  font-weight: 700;
}
</style>
