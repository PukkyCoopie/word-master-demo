<template>
  <div class="shop-treasure-product shop-spell-shelf-cell" aria-hidden="true">
    <div class="shop-treasure-visual">
      <div class="shop-treasure-frame shop-treasure-frame--spell-offer">
        <i
          class="shop-treasure-emoji shop-treasure-emoji--icon"
          :class="iconClass || 'ri-magic-fill'"
          aria-hidden="true"
        />
      </div>
      <div class="shop-treasure-price" aria-label="售价">
        <div
          class="shop-treasure-price-inner"
          :class="{ 'shop-treasure-price-inner--pack-struck': priceStruck }"
        >
          ${{ displayPrice }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { applyShopDiscountPrice } from "../vouchers/voucherRuntime.js";

const props = defineProps({
  iconClass: { type: String, default: "ri-magic-fill" },
  price: { type: Number, default: 0 },
  priceStruck: { type: Boolean, default: false },
  ownedVoucherIds: { type: Array, default: () => [] },
});

const displayPrice = computed(() =>
  applyShopDiscountPrice(Number(props.price) || 0, props.ownedVoucherIds ?? []),
);
</script>
