<template>
  <button
    type="button"
    class="desc-inline-entity"
    :class="`desc-inline-entity--${kind}`"
    :aria-label="ariaLabel"
    @click.stop="emit('click', $event)"
  >
    <VoucherStamp
      v-if="kind === 'voucher'"
      :emoji="voucherEmoji"
      :display-name="voucherDisplayName"
    />
    <LetterTile
      v-else-if="kind === 'wildcardTile'"
      variant="grid"
      class="desc-inline-entity__letter grid-tile"
      letter="?"
      rarity="common"
      material-id="wildcard"
    />
    <span v-else-if="kind === 'treasureSlot'" class="desc-inline-entity__slot treasure-slot" aria-hidden="true" />
  </button>
</template>

<script setup>
import { computed } from "vue";
import LetterTile from "./LetterTile.vue";
import VoucherStamp from "./VoucherStamp.vue";
import { VOUCHERS_BY_ID } from "../vouchers/voucherDefinitions.js";
import { formatVoucherDisplayName } from "../vouchers/voucherDisplay.js";

const props = defineProps({
  kind: {
    type: String,
    required: true,
    validator: (v) => ["voucher", "wildcardTile", "treasureSlot"].includes(v),
  },
  refId: { type: String, default: "" },
});

const emit = defineEmits(["click"]);

const voucherDef = computed(() => {
  if (props.kind !== "voucher") return null;
  return VOUCHERS_BY_ID.get(String(props.refId ?? "")) ?? null;
});

const voucherEmoji = computed(() => voucherDef.value?.emoji ?? "🏷️");
const voucherDisplayName = computed(() => {
  const d = voucherDef.value;
  if (!d) return "优惠券";
  return formatVoucherDisplayName(d, { pairHasTier2Owned: false });
});

const ariaLabel = computed(() => {
  if (props.kind === "voucher") return voucherDisplayName.value;
  if (props.kind === "wildcardTile") return "万能块";
  return "宝藏栏位";
});
</script>
