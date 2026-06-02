<template>
  <div class="collection-grid collection-grid--shop-cells">
    <CollectionShopTreasureCell
      v-for="entry in entries"
      :key="entry.treasureId"
      :unknown="!entry.discovered"
      :name="entry.name"
      :emoji="entry.emoji"
      :rarity="entry.rarity"
      :price="entry.price"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { TREASURE_CATALOG } from "../../treasures/treasureCatalog.js";
import { getTreasureDef } from "../../treasures/treasureRegistry.js";
import CollectionShopTreasureCell from "./CollectionShopTreasureCell.vue";

const props = defineProps({
  discoveredTreasureIds: { type: Array, default: () => [] },
});

const discoveredSet = computed(() => new Set((props.discoveredTreasureIds ?? []).map(String)));

const entries = computed(() =>
  TREASURE_CATALOG.map((row) => {
    const discovered = discoveredSet.value.has(String(row.treasureId));
    const def = getTreasureDef(row.treasureId);
    return {
      treasureId: row.treasureId,
      discovered,
      name: def?.name ?? row.name,
      emoji: def?.emoji ?? row.emoji,
      rarity: def?.rarity ?? "rare",
      price: def?.price ?? 0,
    };
  }),
);
</script>
