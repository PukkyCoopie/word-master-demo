<template>
  <div class="collection-treasure-panel">
    <div class="collection-treasure-toolbar">
      <label class="collection-treasure-toolbar__group-toggle">
        <span class="collection-treasure-toolbar__group-label">按分组查看</span>
        <SettingsToggle v-model="groupViewModel" class="collection-treasure-toolbar__toggle" aria-label="按分组查看" />
      </label>
      <SettingsSegmentControl
        v-model="groupByModel"
        class="collection-treasure-toolbar__segment"
        aria-label="宝藏分组依据"
        :disabled="!groupViewModel"
        :options="GROUP_BY_OPTIONS"
      />
    </div>

    <template v-if="groupViewModel">
      <section
        v-for="group in groupedSections"
        :key="group.key"
        class="collection-group collection-treasure-group"
      >
        <div class="collection-group-divider" aria-hidden="true">
          <span class="collection-group-divider__label">{{ group.label }}</span>
        </div>
        <div class="collection-grid collection-grid--shop-cells collection-grid--grouped">
          <CollectionShopTreasureCell
            v-for="entry in group.entries"
            :key="entry.treasureId"
            :unknown="!entry.discovered"
            :prerequisite-locked="entry.prerequisiteLocked"
            :show-prerequisite-badge="entry.hasPrerequisite"
            :treasure-id="entry.treasureId"
            :name="entry.name"
            :emoji="entry.emoji"
            :rarity="entry.rarity"
            :price="entry.price"
            :show-new-mark="entry.showNewMark"
            :tab-preview-revealed="tabPreviewRevealed"
            @select="$emit('select-treasure', $event)"
          />
        </div>
      </section>
    </template>

    <div v-else class="collection-grid collection-grid--shop-cells">
      <CollectionShopTreasureCell
        v-for="entry in flatEntries"
        :key="entry.treasureId"
        :unknown="!entry.discovered"
        :prerequisite-locked="entry.prerequisiteLocked"
        :show-prerequisite-badge="entry.hasPrerequisite"
        :treasure-id="entry.treasureId"
        :name="entry.name"
        :emoji="entry.emoji"
        :rarity="entry.rarity"
        :price="entry.price"
        :show-new-mark="entry.showNewMark"
        :tab-preview-revealed="tabPreviewRevealed"
        @select="$emit('select-treasure', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { TREASURE_CATALOG } from "../../treasures/treasureCatalog.js";
import { getTreasureDef } from "../../treasures/treasureRegistry.js";
import { treasureHasCollectionPrerequisite, resolveCollectionTreasureEntryState } from "../../collection/collectionEntryState.js";
import { collectionNewKeyForTreasure } from "../../collection/collectionNewDiscoveries.js";
import {
  TREASURE_COLLECTION_GROUP_BY,
  groupTreasureCatalogRows,
  sortTreasureCatalogRows,
} from "../../collection/collectionTreasureSort.js";
import SettingsSegmentControl from "../SettingsSegmentControl.vue";
import SettingsToggle from "../SettingsToggle.vue";
import CollectionShopTreasureCell from "./CollectionShopTreasureCell.vue";

const GROUP_BY_OPTIONS = Object.freeze([
  { id: TREASURE_COLLECTION_GROUP_BY.rarity, label: "稀有度" },
  { id: TREASURE_COLLECTION_GROUP_BY.price, label: "价格" },
  { id: TREASURE_COLLECTION_GROUP_BY.version, label: "加入版本" },
]);

const props = defineProps({
  discoveredTreasureIds: { type: Array, default: () => [] },
  tabPreviewRevealed: { type: Boolean, default: false },
  collectionNewKeys: { type: Object, default: () => new Set() },
  groupView: { type: Boolean, default: false },
  groupBy: {
    type: String,
    default: TREASURE_COLLECTION_GROUP_BY.rarity,
    validator: (v) =>
      v === TREASURE_COLLECTION_GROUP_BY.rarity ||
      v === TREASURE_COLLECTION_GROUP_BY.price ||
      v === TREASURE_COLLECTION_GROUP_BY.version,
  },
});

const emit = defineEmits(["select-treasure", "update:groupView", "update:groupBy"]);

const groupViewModel = computed({
  get: () => props.groupView,
  set: (value) => emit("update:groupView", value === true),
});

const groupByModel = computed({
  get: () => props.groupBy,
  set: (value) => emit("update:groupBy", value),
});

/** @param {{ treasureId: string, name?: string, emoji?: string }} row */
function mapRowToEntry(row) {
  const tid = String(row.treasureId);
  const entryState = resolveCollectionTreasureEntryState(tid, props.discoveredTreasureIds);
  const discovered = entryState === "discovered";
  const def = getTreasureDef(row.treasureId);
  const hasPrerequisite = treasureHasCollectionPrerequisite(row.treasureId);
  return {
    treasureId: row.treasureId,
    discovered,
    prerequisiteLocked: entryState === "prerequisite-locked",
    hasPrerequisite,
    name: def?.name ?? row.name,
    emoji: def?.emoji ?? row.emoji,
    rarity: def?.rarity ?? "rare",
    price: def?.price ?? 0,
    showNewMark: discovered && props.collectionNewKeys.has(collectionNewKeyForTreasure(row.treasureId)),
  };
}

const flatEntries = computed(() =>
  sortTreasureCatalogRows(TREASURE_CATALOG, getTreasureDef).map((row) => mapRowToEntry(row)),
);

const groupedSections = computed(() =>
  groupTreasureCatalogRows(TREASURE_CATALOG, getTreasureDef, props.groupBy).map((group) => ({
    key: group.key,
    label: group.label,
    entries: group.rows.map((row) => mapRowToEntry(row)),
  })),
);
</script>

<style scoped>
.collection-treasure-panel {
  display: flex;
  flex-direction: column;
  gap: calc(8 * var(--rpx));
}

.collection-treasure-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(12 * var(--rpx));
  margin-bottom: calc(6 * var(--rpx));
  min-width: 0;
}

.collection-treasure-toolbar__group-toggle {
  display: flex;
  align-items: center;
  gap: calc(10 * var(--rpx));
  min-width: 0;
  flex: 0 1 auto;
  cursor: pointer;
}

.collection-treasure-toolbar__group-label {
  flex-shrink: 0;
  font-size: calc(26 * var(--rpx));
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-dark, #3c3a32);
}

.collection-treasure-toolbar__toggle :deep(.settings-toggle-track--on) {
  background: var(--collection-purple, #7b68a8);
}

.collection-treasure-toolbar__segment {
  flex: 1 1 auto;
  min-width: 0;
  max-width: calc(360 * var(--rpx));
}

.collection-treasure-toolbar__segment :deep(.settings-segment) {
  --seg-pad: calc(4 * var(--rpx));
  max-width: none;
}

.collection-treasure-toolbar__segment :deep(.settings-segment-btn) {
  padding: calc(8 * var(--rpx)) calc(4 * var(--rpx));
  font-size: calc(22 * var(--rpx));
}
</style>
