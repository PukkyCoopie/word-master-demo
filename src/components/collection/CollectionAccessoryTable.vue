<template>
  <div class="collection-accessory-list">
    <article
      v-for="row in rows"
      :key="row.id"
      class="collection-accessory-row"
      :class="{ 'collection-accessory-row--unknown': !row.discovered }"
    >
      <div class="collection-accessory-row__chip">
        <template v-if="row.discovered">
          <span
            v-if="row.scopeClass === 'treasure-accessory-chip'"
            class="collection-accessory-chip-showcase treasure-accessory-chip"
            :class="row.chipClass"
          >
            <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
            <i class="treasure-accessory-chip-icon" :class="row.iconClass" aria-hidden="true" />
          </span>
          <span v-else class="collection-accessory-chip-showcase tile-accessory-chip" :class="row.chipClass">
            <span class="tile-accessory-chip-ripple" aria-hidden="true" />
            <i class="tile-accessory-chip-icon" :class="row.iconClass" aria-hidden="true" />
          </span>
        </template>
        <span v-else class="collection-accessory-chip-showcase collection-accessory-chip-showcase--unknown" aria-hidden="true">
          ?
        </span>
      </div>
      <div class="collection-accessory-row__divider" aria-hidden="true" />
      <p class="collection-accessory-row__desc treasure-detail-desc-body-text">
        <TreasureDescSegmentList v-if="row.discovered" :segments="row.segments" />
        <span v-else>{{ unknownLabel }}</span>
      </p>
    </article>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { ACCESSORY_CATALOG } from "../../accessories/accessoryCatalog.js";
import {
  getTileAccessoryEffectDescription,
  getTreasureAccessoryPanelDescription,
} from "../../game/gameConceptCopy.js";
import { parsePlainEffectCopyToSegments } from "../../treasures/treasureDescription.js";
import { COLLECTION_UNKNOWN_LABEL } from "../../collection/collectionDisplayUtils.js";
import TreasureDescSegmentList from "../TreasureDescSegmentList.vue";

const props = defineProps({
  discoveredAccessoryIds: { type: Array, default: () => [] },
});

const unknownLabel = COLLECTION_UNKNOWN_LABEL;

const discoveredSet = computed(() => new Set((props.discoveredAccessoryIds ?? []).map(String)));

const rows = computed(() =>
  Object.values(ACCESSORY_CATALOG).map((def) => {
    const discovered = discoveredSet.value.has(def.id);
    const description =
      def.scopes.includes("tile") && !def.scopes.includes("treasure")
        ? getTileAccessoryEffectDescription(def.id)
        : def.scopes.includes("treasure") && !def.scopes.includes("tile")
          ? getTreasureAccessoryPanelDescription(def.id)
          : getTileAccessoryEffectDescription(def.id) ||
            getTreasureAccessoryPanelDescription(def.id) ||
            "";
    return {
      id: def.id,
      discovered,
      chipClass: def.chip.chipClass,
      iconClass: def.chip.iconClass,
      scopeClass:
        def.legacyStorage === "treasure_field" ? "treasure-accessory-chip" : "tile-accessory-chip",
      segments: parsePlainEffectCopyToSegments(description),
    };
  }),
);
</script>

<style scoped>
.collection-accessory-list {
  display: flex;
  flex-direction: column;
  gap: calc(14 * var(--rpx));
}

.collection-accessory-row {
  display: flex;
  align-items: stretch;
  min-height: calc(88 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  background: rgba(0, 0, 0, 0.045);
  border: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
  overflow: hidden;
}

.collection-accessory-row__chip {
  flex: 0 0 calc(112 * var(--rpx));
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(14 * var(--rpx)) calc(12 * var(--rpx));
  box-sizing: border-box;
}

.collection-accessory-row__divider {
  flex: 0 0 calc(1 * var(--rpx));
  align-self: center;
  width: calc(1 * var(--rpx));
  height: 58%;
  background: rgba(60, 58, 50, 0.14);
}

.collection-accessory-row__desc {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx)) calc(14 * var(--rpx)) calc(12 * var(--rpx));
  display: flex;
  align-items: center;
  font-size: calc(26 * var(--rpx));
  line-height: 1.55;
  color: var(--text-dark, #3c3a32);
  word-break: break-word;
}

.collection-accessory-row--unknown .collection-accessory-row__desc {
  color: var(--text-muted, #776e65);
}

.collection-accessory-chip-showcase {
  position: static;
  inset: auto;
  right: auto;
  bottom: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  overflow: hidden;
  flex-shrink: 0;
  pointer-events: none;
  --slot-scale: 1;
}

.collection-accessory-chip-showcase.tile-accessory-chip {
  width: calc(56 * var(--rpx));
  height: calc(56 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
}

.collection-accessory-chip-showcase.tile-accessory-chip .tile-accessory-chip-icon {
  font-size: calc(30 * var(--rpx));
  line-height: 1;
  display: block;
}

.collection-accessory-chip-showcase.treasure-accessory-chip {
  width: calc(56 * var(--rpx));
  height: calc(56 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
}

.collection-accessory-chip-showcase.treasure-accessory-chip .treasure-accessory-chip-icon {
  font-size: calc(30 * var(--rpx));
  line-height: 1;
  display: block;
}

.collection-accessory-chip-showcase--unknown {
  width: calc(56 * var(--rpx));
  height: calc(56 * var(--rpx));
  border-radius: calc(12 * var(--rpx));
  background: rgba(0, 0, 0, 0.08);
  color: var(--text-muted, #776e65);
  font-size: calc(30 * var(--rpx));
  font-weight: 700;
  line-height: 1;
}
</style>
