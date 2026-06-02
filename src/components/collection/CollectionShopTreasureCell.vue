<template>
  <button
    type="button"
    class="collection-shop-cell shop-treasure-product"
    :class="{ 'collection-shop-cell--unknown': unknown }"
    :disabled="unknown"
    :aria-label="unknown ? displayName : `预览 ${displayName}`"
    @click="onClick"
  >
    <div class="shop-treasure-visual">
      <div
        class="shop-treasure-frame"
        :class="{
          'shop-treasure-frame--spell-offer': spellOffer,
          'shop-treasure-frame--length-offer':
            upgradeOffer && upgradeKind !== 'rarity' && (lengthBadgeLabel || lengthLabel),
          'shop-treasure-frame--pack-rarity': upgradeOffer && upgradeKind === 'rarity',
          'collection-shop-cell__frame--unknown': unknown,
        }"
      >
        <template v-if="unknown">
          <span class="collection-shop-cell__unknown" aria-hidden="true">?</span>
        </template>
        <template v-else-if="spellOffer || upgradeOffer">
          <i
            v-if="iconClass"
            class="shop-treasure-emoji shop-treasure-emoji--icon"
            :class="iconClass"
            aria-hidden="true"
          ></i>
          <span
            v-if="upgradeOffer && upgradeKind === 'rarity' && (lengthBadgeLabel || lengthLabel)"
            class="shop-pack-rarity-caption"
            >{{ lengthBadgeLabel || lengthLabel }}</span
          >
          <span
            v-else-if="upgradeOffer && (lengthBadgeLabel || lengthLabel)"
            class="shop-upgrade-length"
            :class="{
              'shop-upgrade-length--single-digit': isSingleDigitLabel(lengthBadgeLabel || lengthLabel),
            }"
            >{{ lengthBadgeLabel || lengthLabel }}</span
          >
        </template>
        <template v-else>
          <span class="letter-gem" :class="gemClass" aria-hidden="true" />
          <span class="shop-treasure-emoji" role="img" :aria-label="name">{{ emoji }}</span>
        </template>
      </div>
      <div class="shop-treasure-price">
        <div class="shop-treasure-price-inner">{{ priceLabel }}</div>
      </div>
    </div>
    <p
      class="collection-shop-cell__name"
      :class="{ 'collection-shop-cell__name--unknown': unknown }"
    >
      {{ displayName }}
    </p>
  </button>
</template>

<script setup>
import { computed } from "vue";
import { COLLECTION_UNKNOWN_LABEL, gemClassForTreasureRarity } from "../../collection/collectionDisplayUtils.js";
import { isSingleDigitLabel } from "../detailLayerFormatters.js";

const props = defineProps({
  unknown: { type: Boolean, default: false },
  spellOffer: { type: Boolean, default: false },
  upgradeOffer: { type: Boolean, default: false },
  upgradeKind: { type: String, default: "" },
  lengthBadgeLabel: { type: String, default: "" },
  lengthLabel: { type: String, default: "" },
  name: { type: String, default: "" },
  emoji: { type: String, default: "" },
  iconClass: { type: String, default: "" },
  rarity: { type: String, default: "rare" },
  price: { type: Number, default: null },
  treasureId: { type: String, default: "" },
  spellId: { type: String, default: "" },
});

const emit = defineEmits(["select"]);

const gemClass = computed(() => gemClassForTreasureRarity(props.rarity));

const displayName = computed(() =>
  props.unknown ? COLLECTION_UNKNOWN_LABEL : String(props.name ?? "").trim(),
);

const priceLabel = computed(() => {
  if (props.unknown) return "$?";
  if (props.price == null || !Number.isFinite(Number(props.price))) return "$0";
  return `$${Math.max(0, Math.floor(Number(props.price) || 0))}`;
});

/** @param {MouseEvent} event */
function onClick(event) {
  if (props.unknown) return;
  const el = event.currentTarget;
  emit("select", {
    treasureId: props.treasureId,
    spellId: props.spellId,
    spellOffer: props.spellOffer,
    originEl: el instanceof HTMLElement ? el : null,
  });
}
</script>

<style scoped>
.collection-shop-cell {
  overflow: visible;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  border-radius: calc(4 * var(--rpx));
  transition: filter 0.1s ease;
}

.collection-shop-cell:not(:disabled):hover {
  filter: brightness(1.04);
}

.collection-shop-cell:not(:disabled):active {
  filter: brightness(0.96);
}

.collection-shop-cell--unknown {
  cursor: default;
  opacity: 0.55;
}

.collection-shop-cell__frame--unknown {
  display: flex;
  align-items: center;
  justify-content: center;
}

.collection-shop-cell__unknown {
  font-size: calc(100cqmin * 40 / 108);
  font-weight: 700;
  color: var(--text-muted, #776e65);
  line-height: 1;
}

.collection-shop-cell__name {
  margin: calc(6 * var(--rpx)) 0 0;
  width: 100%;
  text-align: center;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-dark, #3c3a32);
  word-break: break-word;
}

.collection-shop-cell__name--unknown {
  color: var(--text-muted, #776e65);
}
</style>
