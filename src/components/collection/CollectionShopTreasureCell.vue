<template>
  <button
    type="button"
    class="collection-shop-cell shop-treasure-product"
    :class="{
      'collection-shop-cell--unknown': unknown && !prerequisiteLocked,
      'collection-shop-cell--prerequisite-locked': prerequisiteLocked,
    }"
    :aria-label="cellAriaLabel"
    @click="onClick"
  >
    <CollectionNewMark :show="showNewMark" />
    <div class="shop-treasure-visual">
      <div
        class="shop-treasure-frame"
        :class="{
          'shop-treasure-frame--spell-offer': spellOffer,
          'shop-treasure-frame--length-offer':
            upgradeOffer && upgradeKind !== 'rarity' && (lengthBadgeLabel || lengthLabel),
          'shop-treasure-frame--pack-rarity': upgradeOffer && upgradeKind === 'rarity',
        }"
      >
        <template v-if="spellOffer || upgradeOffer">
          <span
            v-if="showUnknownVisual"
            class="collection-shop-cell__unknown shop-treasure-emoji"
            aria-hidden="true"
            >?</span
          >
          <template v-else>
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
        </template>
        <template v-else>
          <span class="letter-gem" :class="gemClass" aria-hidden="true" />
          <span
            v-if="showUnknownVisual"
            class="collection-shop-cell__unknown shop-treasure-emoji"
            aria-hidden="true"
            >?</span
          >
          <span v-else class="shop-treasure-emoji" role="img" :aria-label="name">{{ emoji }}</span>
        </template>
      </div>
      <div class="shop-treasure-price">
        <div class="shop-treasure-price-inner">{{ priceLabel }}</div>
      </div>
    </div>
    <p
      class="collection-shop-cell__name"
      :class="{
        'collection-shop-cell__name--unknown': showUnknownVisual,
        'collection-shop-cell__name--prerequisite': prerequisiteLocked,
      }"
    >
      <i
        v-if="showPrerequisiteBadge"
        class="ri-error-warning-fill collection-prerequisite-badge collection-shop-cell__prerequisite-badge"
        aria-hidden="true"
      ></i>
      {{ displayName }}
    </p>
  </button>
</template>

<script setup>
import { computed } from "vue";
import { COLLECTION_UNKNOWN_LABEL, gemClassForTreasureRarity } from "../../collection/collectionDisplayUtils.js";
import { isSingleDigitLabel } from "../detailLayerFormatters.js";
import CollectionNewMark from "./CollectionNewMark.vue";

const props = defineProps({
  unknown: { type: Boolean, default: false },
  showNewMark: { type: Boolean, default: false },
  /** 未发现但有 unlockPrerequisite，可点开预览 */
  prerequisiteLocked: { type: Boolean, default: false },
  /** 有 unlockPrerequisite 时在名称前显示感叹号（含已发现） */
  showPrerequisiteBadge: { type: Boolean, default: false },
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

const showUnknownVisual = computed(() => props.unknown);

const displayName = computed(() =>
  showUnknownVisual.value ? COLLECTION_UNKNOWN_LABEL : String(props.name ?? "").trim(),
);

const priceLabel = computed(() => {
  if (showUnknownVisual.value) return "$?";
  if (props.price == null || !Number.isFinite(Number(props.price))) return "$0";
  return `$${Math.max(0, Math.floor(Number(props.price) || 0))}`;
});

const cellAriaLabel = computed(() => {
  if (props.unknown) return "预览未解锁条目";
  return `预览 ${displayName.value}`;
});

/** @param {MouseEvent} event */
function onClick(event) {
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
  position: relative;
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
  opacity: 0.55;
}

.collection-shop-cell--prerequisite-locked {
  cursor: pointer;
  opacity: 0.78;
}

.collection-shop-cell__unknown {
  position: relative;
  z-index: 1;
  font-size: calc(100cqmin * 40 / 108);
  font-weight: 700;
  color: var(--text-muted, #776e65);
  line-height: 1;
}

.collection-shop-cell__name {
  margin: calc(6 * var(--rpx)) 0 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: calc(6 * var(--rpx));
  text-align: center;
  font-size: calc(24 * var(--rpx));
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-dark, #3c3a32);
  word-break: break-word;
}

.collection-shop-cell__name--unknown,
.collection-shop-cell__name--prerequisite {
  color: var(--text-muted, #776e65);
}

.collection-shop-cell__prerequisite-badge {
  flex-shrink: 0;
}
</style>
