<template>
  <div
    class="voucher-stamp-stack"
    :class="{
      'voucher-stamp-stack--stacked': stacked,
      'voucher-stamp-stack--compact': compact,
    }"
  >
    <template v-if="stacked">
      <VoucherStamp
        class="voucher-stamp-stack__back"
        :emoji="stamps[0].emoji"
        :display-name="stamps[0].displayName"
        :compact="compact"
      />
      <VoucherStamp
        class="voucher-stamp-stack__front"
        :emoji="stamps[1].emoji"
        :display-name="stamps[1].displayName"
        :compact="compact"
      />
    </template>
    <VoucherStamp
      v-else
      :emoji="stamps[0]?.emoji ?? ''"
      :display-name="stamps[0]?.displayName ?? ''"
      :compact="compact"
    />
  </div>
</template>

<script setup>
import { computed } from "vue";
import VoucherStamp from "./VoucherStamp.vue";

const props = defineProps({
  /** @type {import('vue').PropType<Array<{ emoji: string, displayName: string }>>} */
  stamps: { type: Array, required: true },
  compact: { type: Boolean, default: false },
});

const stacked = computed(() => props.stamps.length >= 2);
</script>
