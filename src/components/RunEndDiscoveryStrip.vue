<template>
  <div class="run-end-discovery-strip">
    <div class="run-end-discovery-strip__scroll">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="run-end-discovery-chip"
        :aria-label="item.ariaLabel"
        @click="onChipClick(item, $event)"
      >
        <VoucherStampStack
          v-if="item.kind === 'voucher'"
          class="run-end-discovery-chip__voucher"
          :stamps="item.stamps"
          compact
        />
        <LetterTile
          v-else-if="item.kind === 'material'"
          variant="grid"
          class="run-end-discovery-chip__material grid-tile"
          :letter="item.materialId === 'wildcard' ? '?' : '·'"
          :hide-letter="item.materialId !== 'wildcard'"
          hide-rarity-gem
          :material-id="item.materialId"
        />
        <span
          v-else-if="item.kind === 'accessory'"
          class="run-end-discovery-chip__accessory"
          :class="[item.scopeClass, item.chipClass]"
        >
          <span
            :class="
              item.scopeClass === 'treasure-accessory-chip'
                ? 'treasure-accessory-chip-ripple'
                : 'tile-accessory-chip-ripple'
            "
            aria-hidden="true"
          />
          <i
            :class="[
              item.scopeClass === 'treasure-accessory-chip'
                ? 'treasure-accessory-chip-icon'
                : 'tile-accessory-chip-icon',
              item.iconClass,
            ]"
            aria-hidden="true"
          />
        </span>
        <div
          v-else
          class="run-end-discovery-chip__frame shop-treasure-frame"
          :class="{
            'shop-treasure-frame--spell-offer': item.kind === 'spell',
            'shop-treasure-frame--length-offer':
              item.kind === 'upgrade' && item.upgradeKind !== 'rarity' && upgradeBadge(item),
            'shop-treasure-frame--pack-rarity':
              item.kind === 'upgrade' && item.upgradeKind === 'rarity',
          }"
        >
          <template v-if="item.kind === 'treasure'">
            <span class="letter-gem" :class="'gem-' + (item.rarity || 'common')" aria-hidden="true" />
            <span class="shop-treasure-emoji" role="img" :aria-label="item.name">{{ item.emoji }}</span>
          </template>
          <template v-else-if="item.kind === 'spell' || item.kind === 'upgrade'">
            <i
              v-if="item.iconClass"
              class="shop-treasure-emoji shop-treasure-emoji--icon"
              :class="item.iconClass"
              aria-hidden="true"
            />
            <span
              v-if="item.kind === 'upgrade' && item.upgradeKind === 'rarity' && upgradeBadge(item)"
              class="shop-pack-rarity-caption"
              >{{ upgradeBadge(item) }}</span
            >
            <span
              v-else-if="item.kind === 'upgrade' && upgradeBadge(item)"
              class="shop-upgrade-length"
              :class="{ 'shop-upgrade-length--single-digit': isSingleDigitLabel(upgradeBadge(item)) }"
              >{{ upgradeBadge(item) }}</span
            >
          </template>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup>
import LetterTile from "./LetterTile.vue";
import VoucherStampStack from "./VoucherStampStack.vue";
import { isSingleDigitLabel } from "./detailLayerFormatters.js";

defineProps({
  /** @type {import('vue').PropType<import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem[]>} */
  items: { type: Array, default: () => [] },
});

const emit = defineEmits(["select"]);

/** @param {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} item */
function upgradeBadge(item) {
  if (item.kind !== "upgrade") return "";
  return String(item.lengthBadgeLabel || item.lengthLabel || "").trim();
}

/** @param {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} item @param {MouseEvent} event */
function onChipClick(item, event) {
  const el = event.currentTarget;
  emit("select", {
    item,
    originEl: el instanceof HTMLElement ? el : null,
  });
}
</script>

<style scoped>
.run-end-discovery-strip {
  --run-end-discovery-chip-size: calc(var(--shop-shelf-cell-size) * 1);
  --run-end-discovery-chip-gap: calc(10 * var(--rpx));
  width: 100%;
  flex-shrink: 0;
}

.run-end-discovery-strip__scroll {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--run-end-discovery-chip-gap);
  width: 100%;
  height: var(--run-end-discovery-chip-size);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.run-end-discovery-strip__scroll::-webkit-scrollbar {
  display: none;
}

.run-end-discovery-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--run-end-discovery-chip-size);
  height: var(--run-end-discovery-chip-size);
  min-width: var(--run-end-discovery-chip-size);
  min-height: var(--run-end-discovery-chip-size);
  max-width: var(--run-end-discovery-chip-size);
  max-height: var(--run-end-discovery-chip-size);
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  border-radius: calc(6 * var(--rpx));
  transition: filter 0.1s ease;
  box-sizing: border-box;
}

.run-end-discovery-chip:hover {
  filter: brightness(1.05);
}

.run-end-discovery-chip:active {
  filter: brightness(0.94);
}

.run-end-discovery-chip__frame {
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
}

.run-end-discovery-chip__voucher {
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  max-width: 100%;
  max-height: 100%;
  flex-shrink: 0;
}

.run-end-discovery-chip__voucher :deep(.voucher-stamp-stack) {
  width: 100%;
  height: 100%;
}

.run-end-discovery-chip__voucher :deep(.voucher-stamp-stack--stacked) {
  height: 100%;
}

.run-end-discovery-chip__voucher :deep(.voucher-stamp) {
  width: 100%;
  height: 100%;
}

.run-end-discovery-chip__voucher :deep(.voucher-stamp__frame) {
  width: 100%;
  height: 100%;
}

.run-end-discovery-chip__material {
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  max-width: 100%;
  max-height: 100%;
  flex-shrink: 0;
}

.run-end-discovery-chip__accessory {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  max-width: 100%;
  max-height: 100%;
  flex-shrink: 0;
  box-sizing: border-box;
  overflow: hidden;
}
</style>
