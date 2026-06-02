<template>
  <table class="collection-accessory-table">
    <tbody>
      <tr
        v-for="row in rows"
        :key="row.id"
        class="collection-accessory-row"
        :class="{ 'collection-accessory-row--unknown': !row.discovered }"
      >
        <td class="collection-accessory-cell collection-accessory-cell--chip">
          <div class="collection-accessory-chip-wrap">
            <template v-if="row.discovered">
              <span
                v-if="row.scopeClass === 'treasure-accessory-chip'"
                class="collection-accessory-chip-showcase treasure-accessory-chip"
                :class="row.chipClass"
              >
                <span class="treasure-accessory-chip-ripple" aria-hidden="true" />
                <i class="treasure-accessory-chip-icon" :class="row.iconClass" aria-hidden="true" />
              </span>
              <span
                v-else
                class="collection-accessory-chip-showcase tile-accessory-chip"
                :class="row.chipClass"
              >
                <span class="tile-accessory-chip-ripple" aria-hidden="true" />
                <i class="tile-accessory-chip-icon" :class="row.iconClass" aria-hidden="true" />
              </span>
            </template>
            <span
              v-else
              class="collection-accessory-chip-showcase collection-accessory-chip-showcase--unknown"
              aria-hidden="true"
            >
              ?
            </span>
          </div>
        </td>
        <td class="collection-accessory-cell collection-accessory-cell--divider" aria-hidden="true" />
        <td class="collection-accessory-cell collection-accessory-cell--text">
          <div class="collection-accessory-text">
            <h3 class="collection-accessory-title">{{ row.title }}</h3>
            <p class="collection-accessory-desc">
              <TreasureDescSegmentList v-if="row.discovered" :segments="row.segments" />
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
import { ACCESSORY_CATALOG } from "../../accessories/accessoryCatalog.js";
import {
  getTileAccessoryEffectDescription,
  getTileBoardAccessoryTitle,
  getTreasureAccessoryPanelDescription,
  getTreasureAccessoryPanelTitle,
} from "../../game/gameConceptCopy.js";
import { parsePlainEffectCopyToSegments } from "../../treasures/treasureDescription.js";
import { COLLECTION_UNKNOWN_LABEL } from "../../collection/collectionDisplayUtils.js";
import TreasureDescSegmentList from "../TreasureDescSegmentList.vue";

const props = defineProps({
  discoveredAccessoryIds: { type: Array, default: () => [] },
});

const unknownLabel = COLLECTION_UNKNOWN_LABEL;

const discoveredSet = computed(() => new Set((props.discoveredAccessoryIds ?? []).map(String)));

/**
 * @param {import('../../accessories/accessoryCatalog.js').AccessoryDef} def
 */
function resolveAccessoryDescription(def) {
  if (def.scopes.includes("tile") && !def.scopes.includes("treasure")) {
    return getTileAccessoryEffectDescription(def.id) ?? "";
  }
  if (def.scopes.includes("treasure") && !def.scopes.includes("tile")) {
    return getTreasureAccessoryPanelDescription(def.id) ?? "";
  }
  return (
    getTileAccessoryEffectDescription(def.id) || getTreasureAccessoryPanelDescription(def.id) || ""
  );
}

/**
 * @param {import('../../accessories/accessoryCatalog.js').AccessoryDef} def
 */
function resolveAccessoryTitle(def) {
  const tileTitle = getTileBoardAccessoryTitle(def.id);
  const treasureTitle = getTreasureAccessoryPanelTitle(def.id);
  return tileTitle || treasureTitle || "";
}

const rows = computed(() =>
  Object.values(ACCESSORY_CATALOG).map((def) => {
    const discovered = discoveredSet.value.has(def.id);
    const description = resolveAccessoryDescription(def);
    return {
      id: def.id,
      discovered,
      title: discovered ? resolveAccessoryTitle(def) : COLLECTION_UNKNOWN_LABEL,
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
.collection-accessory-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 calc(14 * var(--rpx));
}

.collection-accessory-row .collection-accessory-cell {
  vertical-align: middle;
  padding: 0;
  background: rgba(0, 0, 0, 0.045);
  border-top: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
  border-bottom: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
}

.collection-accessory-row--unknown {
  opacity: 0.55;
}

.collection-accessory-row .collection-accessory-cell--chip {
  width: calc(112 * var(--rpx));
  padding: calc(14 * var(--rpx)) calc(12 * var(--rpx));
  border-left: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
  border-radius: calc(12 * var(--rpx)) 0 0 calc(12 * var(--rpx));
}

.collection-accessory-row .collection-accessory-cell--divider {
  width: calc(1 * var(--rpx));
  padding: 0;
  background: rgba(60, 58, 50, 0.14);
  border-top: none;
  border-bottom: none;
}

.collection-accessory-row .collection-accessory-cell--text {
  padding: calc(14 * var(--rpx)) calc(16 * var(--rpx)) calc(14 * var(--rpx)) calc(12 * var(--rpx));
  border-right: calc(1 * var(--rpx)) solid rgba(60, 58, 50, 0.08);
  border-radius: 0 calc(12 * var(--rpx)) calc(12 * var(--rpx)) 0;
}

.collection-accessory-chip-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.collection-accessory-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(6 * var(--rpx));
  text-align: left;
}

.collection-accessory-title {
  margin: 0;
  font-size: calc(28 * var(--rpx));
  font-weight: 800;
  line-height: 1.25;
  color: var(--text-dark, #3c3a32);
}

.collection-accessory-row--unknown .collection-accessory-title {
  color: var(--text-muted, #776e65);
}

.collection-accessory-desc {
  margin: 0;
  width: 100%;
  font-size: calc(24 * var(--rpx));
  line-height: 1.55;
  color: var(--text-dark, #3c3a32);
  text-align: left;
  word-break: break-word;
}

.collection-accessory-row--unknown .collection-accessory-desc {
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
