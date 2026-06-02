<template>
  <div class="collection-grid collection-grid--shop-cells collection-grid--vouchers">
    <button
      v-for="pair in entries"
      :key="pair.pairId"
      type="button"
      class="collection-voucher-cell shop-treasure-product"
      :class="{ 'collection-voucher-cell--unknown': pair.tier < 1 }"
      :disabled="pair.tier < 1"
      @click="onCellClick(pair, $event)"
    >
      <div class="shop-treasure-visual">
        <VoucherStampStack v-if="pair.tier >= 1" :stamps="pair.stamps" />
        <div v-else class="voucher-stamp">
          <div class="voucher-stamp__frame voucher-stamp__frame--placeholder collection-voucher-stamp__frame--unknown">
            <span class="collection-voucher-unknown__mark" aria-hidden="true">?</span>
          </div>
        </div>
        <div class="shop-treasure-price">
          <div class="shop-treasure-price-inner">{{ pair.priceLabel }}</div>
        </div>
      </div>
      <p
        class="collection-shop-cell__name"
        :class="{ 'collection-shop-cell__name--unknown': pair.tier < 1 }"
      >
        {{ pair.displayName }}
      </p>
    </button>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { VOUCHER_PAIR_ORDER } from "../../vouchers/voucherDefinitions.js";
import { COLLECTION_UNKNOWN_LABEL } from "../../collection/collectionDisplayUtils.js";
import { formatVoucherDisplayName } from "../../vouchers/voucherDisplay.js";
import VoucherStampStack from "../VoucherStampStack.vue";

const props = defineProps({
  discoveredVoucherTiers: { type: Object, default: () => ({}) },
});

const emit = defineEmits(["select-voucher"]);

const entries = computed(() =>
  [...VOUCHER_PAIR_ORDER.entries()].map(([pairId, [t1, t2]]) => {
    const tier = props.discoveredVoucherTiers?.[pairId] ?? 0;
    const hasT2 = tier >= 2;
    /** @type {{ emoji: string, displayName: string }[]} */
    const stamps = [];
    if (tier >= 1) {
      stamps.push({
        emoji: t1.emoji,
        displayName: formatVoucherDisplayName(t1, { pairHasTier2Owned: hasT2, showTier1Suffix: hasT2 }),
      });
    }
    if (tier >= 2) {
      stamps.push({
        emoji: t2.emoji,
        displayName: formatVoucherDisplayName(t2, { pairHasTier2Owned: false }),
      });
    }
    const price = tier >= 2 ? t2.price : t1.price;
    const top = hasT2 ? t2 : t1;
    return {
      pairId,
      tier,
      stamps,
      priceLabel: tier >= 1 ? `$${Math.max(0, Math.floor(Number(price) || 0))}` : "$?",
      displayName:
        tier >= 1 ? formatVoucherDisplayName(top, { pairHasTier2Owned: hasT2 }) : COLLECTION_UNKNOWN_LABEL,
    };
  }),
);

/** @param {{ pairId: string, tier: number }} pair @param {MouseEvent} event */
function onCellClick(pair, event) {
  if (pair.tier < 1) return;
  const el = event.currentTarget;
  emit("select-voucher", {
    pairId: pair.pairId,
    discoveredTier: pair.tier,
    originEl: el,
  });
}
</script>

<style scoped>
.collection-voucher-cell {
  overflow: visible;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  cursor: pointer;
  border-radius: calc(4 * var(--rpx));
  transition: filter 0.1s ease;
}

.collection-voucher-cell:not(:disabled):hover {
  filter: brightness(1.04);
}

.collection-voucher-cell:not(:disabled):active {
  filter: brightness(0.96);
}

.collection-voucher-cell--unknown {
  cursor: default;
}

.collection-voucher-stamp__frame--unknown {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
}

.collection-voucher-unknown__mark {
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
