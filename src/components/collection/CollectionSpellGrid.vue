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
      @select="$emit('select-spell', $event)"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { SPELL_DEFINITIONS, getSpellShopPrice } from "../../spells/spellDefinitions.js";
import CollectionShopTreasureCell from "./CollectionShopTreasureCell.vue";

const props = defineProps({
  discoveredSpellIds: { type: Array, default: () => [] },
});

defineEmits(["select-spell"]);

const discoveredSet = computed(() => new Set((props.discoveredSpellIds ?? []).map(String)));

const entries = computed(() =>
  SPELL_DEFINITIONS.map((def) => ({
    id: def.id,
    discovered: discoveredSet.value.has(def.id),
    name: def.name,
    iconClass: def.iconClass,
    price: getSpellShopPrice(def),
  })),
);
</script>
