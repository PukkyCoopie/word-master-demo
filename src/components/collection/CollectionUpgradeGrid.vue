<template>
  <div class="collection-upgrade-sections">
    <section
      v-for="section in sections"
      :key="section.id"
      class="collection-upgrade-section"
    >
      <h2 class="collection-upgrade-section__title">{{ section.title }}</h2>
      <div class="collection-grid collection-grid--shop-cells collection-grid--upgrades">
        <CollectionShopTreasureCell
          v-for="entry in section.entries"
          :key="entry.treasureId"
          upgrade-offer
          :unknown="!entry.discovered"
          :treasure-id="entry.treasureId"
          :name="entry.name"
          :icon-class="entry.iconClass"
          :upgrade-kind="entry.upgradeKind"
          :length-badge-label="entry.lengthBadgeLabel"
          :length-label="entry.lengthLabel"
          :price="entry.price"
          :show-new-mark="entry.showNewMark"
          @select="$emit('select-upgrade', $event)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from "vue";
import {
  COLLECTION_LENGTH_UPGRADE_CATALOG,
  COLLECTION_RARITY_UPGRADE_CATALOG,
} from "../../collection/collectionUpgradeCatalog.js";
import { collectionUpgradeGridListName } from "../../collection/collectionDisplayUtils.js";
import { collectionNewKeyForUpgrade } from "../../collection/collectionNewDiscoveries.js";
import CollectionShopTreasureCell from "./CollectionShopTreasureCell.vue";

const props = defineProps({
  discoveredUpgradeIds: { type: Array, default: () => [] },
  collectionNewKeys: { type: Object, default: () => new Set() },
});

defineEmits(["select-upgrade"]);

const discoveredSet = computed(() => new Set((props.discoveredUpgradeIds ?? []).map(String)));

/** @param {typeof COLLECTION_LENGTH_UPGRADE_CATALOG[number][]} catalog */
function mapUpgradeEntries(catalog) {
  return catalog.map((offer) => {
    const treasureId = String(offer.treasureId ?? "");
    const discovered = discoveredSet.value.has(treasureId);
    return {
      treasureId,
      discovered,
      name: collectionUpgradeGridListName(offer.name),
      iconClass: offer.iconClass,
      upgradeKind: offer.upgradeKind,
      lengthBadgeLabel: offer.lengthBadgeLabel,
      lengthLabel: offer.lengthLabel,
      price: offer.price,
      showNewMark: discovered && props.collectionNewKeys.has(collectionNewKeyForUpgrade(treasureId)),
    };
  });
}

const sections = computed(() => [
  {
    id: "length",
    title: "长度升级",
    entries: mapUpgradeEntries(COLLECTION_LENGTH_UPGRADE_CATALOG),
  },
  {
    id: "rarity",
    title: "稀有度升级",
    entries: mapUpgradeEntries(COLLECTION_RARITY_UPGRADE_CATALOG),
  },
]);
</script>

<style scoped>
.collection-upgrade-sections {
  display: flex;
  flex-direction: column;
  gap: calc(32 * var(--rpx));
}

.collection-upgrade-section__title {
  margin: 0 0 calc(14 * var(--rpx));
  text-align: center;
  font-size: calc(28 * var(--rpx));
  font-weight: 800;
  color: var(--text-dark, #3c3a32);
}
</style>
