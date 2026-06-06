<template>
  <div class="run-end-discovery-strip">
    <div class="run-end-discovery-strip__scroll">
      <component
        v-for="item in items"
        :key="item.key"
        :is="isDiscoveryItemClickable(item) ? 'button' : 'div'"
        :type="isDiscoveryItemClickable(item) ? 'button' : undefined"
        class="run-end-discovery-chip"
        :class="{ 'run-end-discovery-chip--static': !isDiscoveryItemClickable(item) }"
        :aria-label="item.ariaLabel"
        @click="onChipClick(item, $event)"
      >
        <div
          v-if="item.kind === 'voucher'"
          class="run-end-discovery-chip__voucher-wrap shop-treasure-visual"
        >
          <VoucherStampStack :stamps="item.stamps" />
        </div>
        <LetterTile
          v-else-if="item.kind === 'material'"
          variant="grid"
          class="run-end-discovery-chip__material shop-shelf-letter-tile grid-tile"
          :letter="item.materialId === 'wildcard' ? '?' : '·'"
          :hide-letter="item.materialId !== 'wildcard'"
          hide-rarity-gem
          :material-id="item.materialId"
        />
        <div
          v-else-if="item.kind === 'accessory'"
          class="run-end-discovery-chip__frame shop-treasure-frame run-end-discovery-chip__frame--accessory"
        >
          <span
            class="collection-accessory-chip-showcase"
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
        </div>
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
      </component>
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

/** @param {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} item */
function isDiscoveryItemClickable(item) {
  return (
    item.kind === "treasure" ||
    item.kind === "spell" ||
    item.kind === "upgrade" ||
    item.kind === "voucher"
  );
}

/** @param {import('../game/runCollectionDiscoveriesDisplay.js').RunDiscoveryDisplayItem} item @param {MouseEvent} event */
function onChipClick(item, event) {
  if (!isDiscoveryItemClickable(item)) return;
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

.run-end-discovery-chip--static {
  cursor: default;
}

.run-end-discovery-chip--static:hover,
.run-end-discovery-chip--static:active {
  filter: none;
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

.run-end-discovery-chip__voucher-wrap {
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
  max-width: 100%;
  max-height: 100%;
  flex-shrink: 0;
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
</style>
