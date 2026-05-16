<template>
  <div
    class="voucher-stamp"
    :class="{
      'voucher-stamp--empty': empty,
      'voucher-stamp--compact': compact,
    }"
  >
    <div
      class="voucher-stamp__frame"
      :class="{ 'voucher-stamp__frame--placeholder': empty }"
      :role="empty ? undefined : 'img'"
      :aria-label="empty ? undefined : stampAriaLabel"
      :aria-hidden="empty ? true : undefined"
    >
      <template v-if="!empty">
        <span class="voucher-stamp__emoji" aria-hidden="true">{{ emoji }}</span>
      </template>
    </div>
    <div v-if="showPrice" class="shop-treasure-price">
      <div class="shop-treasure-price-inner">${{ priceText }}</div>
    </div>
    <div v-else-if="empty && reservePriceSlot" class="shop-treasure-price" aria-hidden="true">
      <div class="shop-treasure-price-inner">&nbsp;</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  /** 空占位（商店未刷出券等） */
  empty: { type: Boolean, default: false },
  emoji: { type: String, default: "" },
  /** 已含「·二级」等的展示名 */
  displayName: { type: String, default: "" },
  /** 折后整数价；不传则隐藏价签区（对局信息已购列表等） */
  price: { type: Number, default: undefined },
  /** 对局信息等小格略缩 */
  compact: { type: Boolean, default: false },
  /**
   * 空态仍保留底部价签条占位（与商店其它货架空格高度一致）。
   */
  reservePriceSlot: { type: Boolean, default: false },
});

const showPrice = computed(
  () => !props.empty && props.price != null && Number.isFinite(Number(props.price)),
);

const priceText = computed(() => String(Math.max(0, Math.floor(Number(props.price) || 0))));

const stampAriaLabel = computed(() => {
  if (props.empty) return undefined;
  const name = String(props.displayName ?? "").trim();
  if (name) return name;
  const e = String(props.emoji ?? "").trim();
  return e || "优惠券";
});
</script>
