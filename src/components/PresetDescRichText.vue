<template>
  <p
    class="preset-desc-rich-text"
    :class="{
      'preset-desc-rich-text--center': centered,
      [`preset-desc-rich-text--${size}`]: size !== 'normal',
    }"
  >
    <template v-for="(seg, i) in segments" :key="i">
      <br v-if="seg.type === 'br'" />
      <span v-else-if="seg.type === 'text'">{{ seg.v }}</span>
      <span v-else-if="seg.type === 'gain'" class="td-desc-gain">{{ seg.v }}</span>
      <span v-else-if="seg.type === 'concept'" class="td-desc-gain">{{ seg.v }}</span>
      <span
        v-else-if="seg.type === 'handDelta'"
        class="preset-desc-chip"
        :class="isNegativeDelta(seg.v) ? 'preset-desc-chip--discard' : 'preset-desc-chip--hand'"
        >{{ seg.v }}</span
      >
      <span
        v-else-if="seg.type === 'discardDelta'"
        class="preset-desc-chip preset-desc-chip--discard"
        >{{ seg.v }}</span
      >
      <span v-else-if="seg.type === 'money'" class="td-desc-chip td-desc-money"
        ><span class="td-desc-money-dollar">$</span>{{ seg.v }}</span
      >
      <DescInlineEntityChip
        v-else-if="seg.type === 'entityInline'"
        :kind="seg.kind"
        :ref-id="seg.ref"
        @click="(ev) => onEntityClick(seg, ev)"
      />
      <TreasureDescSegmentList v-else :segments="[seg]" />
    </template>
  </p>
</template>

<script setup>
import { computed } from "vue";
import DescInlineEntityChip from "./DescInlineEntityChip.vue";
import TreasureDescSegmentList from "./TreasureDescSegmentList.vue";
import { normalizeTreasureDescription } from "../treasures/treasureDescription.js";
import { VOUCHERS_BY_ID } from "../vouchers/voucherDefinitions.js";
import { getTier1DefForPair } from "../vouchers/voucherDefinitions.js";
import { buildOwnedVoucherDetailTreasure } from "../vouchers/voucherOwnedDisplay.js";

const props = defineProps({
  description: { type: [Array, String], default: () => [] },
  /** 文字居中 */
  centered: { type: Boolean, default: true },
  /** normal | medium | compact */
  size: { type: String, default: "normal" },
});

const emit = defineEmits(["preview-voucher", "preview-wildcard", "preview-treasure-slot"]);

/** @param {string} v */
function isNegativeDelta(v) {
  return String(v ?? "").trim().startsWith("-");
}

/**
 * 预设简介：中文/英文逗号换行展示。
 * @param {import('../treasures/treasureDescription.js').TreasureDescSegment[]} segments
 */
function expandPresetDescriptionCommas(segments) {
  /** @type {import('../treasures/treasureDescription.js').TreasureDescSegment[]} */
  const out = [];
  for (const seg of segments) {
    if (seg.type !== "text") {
      out.push(seg);
      continue;
    }
    const v = String(seg.v ?? "");
    if (!v) continue;
    const parts = v.split(/[，,]/);
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part.length) out.push({ type: "text", v: part });
      if (i < parts.length - 1) out.push({ type: "br" });
    }
  }
  return out;
}

const segments = computed(() =>
  expandPresetDescriptionCommas(normalizeTreasureDescription(props.description)),
);

/** @param {import('../treasures/treasureDescription.js').TreasureDescSegment} seg @param {MouseEvent} ev */
function onEntityClick(seg, ev) {
  if (seg.type !== "entityInline") return;
  if (seg.kind === "voucher") {
    const def = VOUCHERS_BY_ID.get(String(seg.ref ?? ""));
    if (!def) return;
    const group = {
      pairId: def.pairId,
      tier1: def.tier === 1 ? def : getTier1DefForPair(def.pairId),
      tier2: def.tier === 2 ? def : null,
    };
    const detail = buildOwnedVoucherDetailTreasure(group);
    if (detail) emit("preview-voucher", { detail, event: ev });
    return;
  }
  if (seg.kind === "wildcardTile") {
    emit("preview-wildcard", { event: ev });
    return;
  }
  if (seg.kind === "treasureSlot") {
    emit("preview-treasure-slot", { event: ev });
  }
}
</script>

<style scoped>
.preset-desc-rich-text {
  margin: 0;
  font-size: calc(26 * var(--rpx));
  line-height: 1.55;
  color: var(--text);
}

.preset-desc-rich-text--center {
  text-align: center;
}

.preset-desc-rich-text--medium {
  font-size: calc(23 * var(--rpx));
  line-height: 1.5;
}

.preset-desc-rich-text--compact {
  font-size: calc(20 * var(--rpx));
  line-height: 1.45;
}

.preset-desc-rich-text--medium .preset-desc-chip,
.preset-desc-rich-text--compact .preset-desc-chip {
  font-size: calc(20 * var(--rpx));
}

.preset-desc-chip {
  display: inline-block;
  padding: calc(2 * var(--rpx)) calc(8 * var(--rpx));
  border-radius: calc(6 * var(--rpx));
  font-weight: 700;
  font-size: calc(24 * var(--rpx));
  color: #fff;
  vertical-align: baseline;
  margin: 0 calc(2 * var(--rpx));
}

.preset-desc-chip--hand {
  background: #639234;
}

.preset-desc-chip--discard {
  background: #a84642;
}

.preset-desc-rich-text :deep(.td-desc-money) {
  color: var(--money-gold, #b8860b);
  font-weight: 700;
}

.preset-desc-rich-text :deep(.td-desc-money-dollar) {
  font-weight: 700;
}
</style>
