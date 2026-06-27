<template>
  <template v-for="(seg, i) in segments" :key="i">
    <br v-if="seg.type === 'br'" />
    <span v-else-if="seg.type === 'text'">{{ seg.v }}</span>
    <span v-else-if="seg.type === 'gain'" class="td-desc-gain">{{ seg.v }}</span>
    <span v-else-if="seg.type === 'concept'" class="td-desc-gain">{{ seg.v }}</span>
    <span v-else-if="seg.type === 'gainBlock'" class="td-desc-gain-block">
      <RecurseDescSegments :segments="seg.parts" />
    </span>
    <span v-else-if="seg.type === 'riskBlock'" class="td-desc-risk-block">
      <RecurseDescSegments :segments="seg.parts" />
    </span>
    <span v-else-if="seg.type === 'riskText'" class="td-desc-risk-text">{{ seg.v }}</span>
    <span v-else-if="seg.type === 'struckText'" class="td-desc-struck-text">{{ seg.v }}</span>
    <span v-else-if="seg.type === 'rarity'" class="td-desc-chip td-desc-rarity" :class="'td-desc-rarity--' + rarityClass(seg.v)">{{
      seg.v
    }}</span>
    <span
      v-else-if="seg.type === 'mult'"
      class="td-desc-chip td-desc-mult"
      :class="{ 'td-desc-mult--times': isTimesMult(seg.v) }"
      >{{ formatMultLabel(seg.v) }}</span
    >
    <span v-else-if="seg.type === 'score'" class="td-desc-chip td-desc-score">{{ seg.v }}</span>
    <span
      v-else-if="seg.type === 'money'"
      class="td-desc-chip td-desc-money"
      :class="{ 'td-desc-money--debt': isDebtMoneyChipValue(seg.v) }"
      ><span class="td-desc-money-dollar">$</span>{{ seg.v }}</span
    >
    <span v-else-if="seg.type === 'prob'" class="td-desc-chip td-desc-prob">{{ seg.v }}</span>
    <span
      v-else-if="seg.type === 'handDelta'"
      class="td-desc-chip td-desc-hand-delta"
      :class="{ 'td-desc-hand-delta--negative': isNegativeDelta(seg.v) }"
      >{{ seg.v }}</span
    >
    <span v-else-if="seg.type === 'discardDelta'" class="td-desc-chip td-desc-discard-delta">{{ seg.v }}</span>
  </template>
</template>

<script setup>
import { isDebtMoneyChipValue } from "../game/moneyDisplay.js";
import RecurseDescSegments from "./TreasureDescSegmentList.vue";

/**
 * 递归渲染简介片段（含 gainBlock 嵌套）
 */
defineProps({
  segments: { type: Array, required: true },
});

function rarityClass(label) {
  if (label === "普通") return "common";
  if (label === "稀有") return "rare";
  if (label === "史诗") return "epic";
  if (label === "传说") return "legendary";
  return "rare";
}

function isTimesMult(v) {
  const s = String(v).trim();
  return /^[x×]/i.test(s);
}

function formatMultLabel(v) {
  const s = String(v).trim();
  if (/^x/i.test(s)) return "×" + s.slice(1);
  return s;
}

/** @param {string} v */
function isNegativeDelta(v) {
  return String(v ?? "").trim().startsWith("-");
}
</script>
