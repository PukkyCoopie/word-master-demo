<template>
  <div class="collection-grid collection-grid--shop-cells">
    <CollectionShopTreasureCell
      v-for="spell in entries"
      :key="spell.id"
      spell-offer
      :unknown="!spell.discovered"
      :spell-id="spell.id"
      :name="spell.name"
      :icon-class="spell.iconClass"
      :price="spell.price"
      :show-new-mark="spell.showNewMark"
      :tab-preview-revealed="tabPreviewRevealed"
      @select="$emit('select-spell', $event)"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { SPELL_DEFINITIONS, getSpellShopPrice } from "../../spells/spellDefinitions.js";
import { collectionNewKeyForSpell } from "../../collection/collectionNewDiscoveries.js";
import CollectionShopTreasureCell from "./CollectionShopTreasureCell.vue";

const props = defineProps({
  discoveredSpellIds: { type: Array, default: () => [] },
  tabPreviewRevealed: { type: Boolean, default: false },
  collectionNewKeys: { type: Object, default: () => new Set() },
});

defineEmits(["select-spell"]);

const discoveredSet = computed(() => new Set((props.discoveredSpellIds ?? []).map(String)));

const entries = computed(() =>
  SPELL_DEFINITIONS.map((def) => {
    const discovered = discoveredSet.value.has(def.id);
    return {
      id: def.id,
      discovered,
      name: def.name,
      iconClass: def.iconClass,
      price: getSpellShopPrice(def),
      showNewMark: discovered && props.collectionNewKeys.has(collectionNewKeyForSpell(def.id)),
    };
  }),
);
</script>
