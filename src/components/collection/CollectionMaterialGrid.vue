<template>
  <table class="collection-material-table">
    <tbody>
      <tr
        v-for="item in entries"
        :key="item.id"
        class="collection-material-row"
        :class="{ 'collection-material-row--unknown': !item.discovered }"
      >
        <td class="collection-material-cell collection-material-cell--tile">
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
            <div
              v-else
              class="collection-material-tile collection-material-tile--unknown"
              aria-hidden="true"
            >
              <span class="collection-material-unknown__mark">?</span>
            </div>
          </div>
        </td>
        <td class="collection-material-cell collection-material-cell--divider" aria-hidden="true" />
        <td class="collection-material-cell collection-material-cell--text">
          <div class="collection-material-text">
            <h3 class="collection-material-title">{{ item.title }}</h3>
            <p class="collection-material-desc">
              <TreasureDescSegmentList v-if="item.discovered" :segments="item.segments" />
              <span v-else>{{ unknownLabel }}</span>
            </p>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
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
.collection-material-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 calc(14 * var(--rpx));
}

.collection-material-row .collection-material-cell {
  vertical-align: middle;
  padding: 0;
  background: rgba(0, 0, 0, 0.045);
  border-top: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
  border-bottom: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
}

.collection-material-row--unknown {
  opacity: 0.55;
}

.collection-material-row .collection-material-cell--tile {
  width: calc(112 * var(--rpx));
  padding: calc(14 * var(--rpx)) calc(12 * var(--rpx));
  border-left: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
  border-radius: calc(12 * var(--rpx)) 0 0 calc(12 * var(--rpx));
}

.collection-material-row .collection-material-cell--divider {
  width: calc(1 * var(--rpx));
  padding: 0;
  background: rgba(60, 58, 50, 0.14);
  border-top: none;
  border-bottom: none;
}

.collection-material-row .collection-material-cell--text {
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx)) calc(14 * var(--rpx)) calc(12 * var(--rpx));
  border-right: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
  border-radius: 0 calc(12 * var(--rpx)) calc(12 * var(--rpx)) 0;
}

.collection-material-tile-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  cursor: default;
}

.collection-material-tile {
  width: calc(72 * var(--rpx));
  height: calc(72 * var(--rpx));
  flex-shrink: 0;
  pointer-events: none;
  cursor: default;
}

.collection-material-tile--unknown {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: calc(12 * var(--rpx));
  background: rgba(0, 0, 0, 0.08);
  box-shadow: inset 0 0 0 calc(2 * var(--rpx)) rgba(60, 58, 50, 0.06);
}

.collection-material-unknown__mark {
  font-size: calc(32 * var(--rpx));
  font-weight: 700;
  color: var(--text-muted, #776e65);
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
  color: var(--text-dark, #3c3a32);
}

.collection-material-row--unknown .collection-material-title {
  color: var(--text-muted, #776e65);
}

.collection-material-desc {
  margin: 0;
  width: 100%;
  font-size: calc(24 * var(--rpx));
  line-height: 1.55;
  color: var(--text-dark, #3c3a32);
  text-align: left;
  word-break: break-word;
}

.collection-material-row--unknown .collection-material-desc {
  color: var(--text-muted, #776e65);
}
</style>
