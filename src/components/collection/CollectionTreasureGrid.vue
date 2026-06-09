<template>
  <div class="collection-grid collection-grid--shop-cells">
    <CollectionShopTreasureCell
      v-for="entry in entries"
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
      @select="$emit('select-treasure', $event)"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { TREASURE_CATALOG } from "../../treasures/treasureCatalog.js";
import { getTreasureDef } from "../../treasures/treasureRegistry.js";
import { treasureHasCollectionPrerequisite } from "../../collection/collectionEntryState.js";
import { collectionNewKeyForTreasure } from "../../collection/collectionNewDiscoveries.js";
import { sortTreasureCatalogRows } from "../../collection/collectionTreasureSort.js";
import CollectionShopTreasureCell from "./CollectionShopTreasureCell.vue";

const props = defineProps({
  discoveredTreasureIds: { type: Array, default: () => [] },
  collectionNewKeys: { type: Object, default: () => new Set() },
});

defineEmits(["select-treasure"]);

const discoveredSet = computed(() => new Set((props.discoveredTreasureIds ?? []).map(String)));

const entries = computed(() =>
  sortTreasureCatalogRows(TREASURE_CATALOG, getTreasureDef).map((row) => {
    const discovered = discoveredSet.value.has(String(row.treasureId));
    const def = getTreasureDef(row.treasureId);
    const hasPrerequisite = treasureHasCollectionPrerequisite(row.treasureId);
    return {
      treasureId: row.treasureId,
      discovered,
      prerequisiteLocked: !discovered && hasPrerequisite,
      hasPrerequisite,
      name: def?.name ?? row.name,
      emoji: def?.emoji ?? row.emoji,
      rarity: def?.rarity ?? "rare",
      price: def?.price ?? 0,
      showNewMark: discovered && props.collectionNewKeys.has(collectionNewKeyForTreasure(row.treasureId)),
    };
  }),
);
</script>
