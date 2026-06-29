<template>
  <p
    class="treasure-desc-rich treasure-detail-desc-body-text"
    :class="{ 'treasure-detail-desc-panel-body': panelBody }"
  >
    <TreasureDescSegmentList :segments="segments" />
  </p>
</template>

<script setup>
import { computed } from "vue";
import TreasureDescSegmentList from "./TreasureDescSegmentList.vue";
import { applyLetterQCopyToDescSegments } from "../settings/letterQ.js";
import { gameSettings } from "../settings/gameSettings.js";
import {
  expandEffectTokensInDescription,
  expandRarityLabelsInDescription,
  injectLineBreaksBeforeParentheses,
  normalizeTreasureDescription,
  polishTreasureDescriptionSegments,
  resolveDescriptionProbabilityDisplay,
} from "../treasures/treasureDescription.js";

const props = defineProps({
  /** @type {import('../treasures/treasureDescription.js').TreasureDescSegment[] | string | undefined} */
  description: { type: [Array, String], default: () => [] },
  /** 分节正文（配饰 / tile）：与 `.treasure-detail-desc-panel-body` 排版一致并居中 */
  panelBody: { type: Boolean, default: false },
  /** 宝藏主简介：英文字母大写、文案内 xN → ×N chip */
  polishTreasureCopy: { type: Boolean, default: false },
  /** 已拥有彗星（45）叠乘次数：简介 prob chip 按 2^n 显示（如 1/5→2/5→4/5） */
  probabilityDoublerCount: { type: Number, default: 0 },
});

const segments = computed(() => {
  void gameSettings.letterQMode;
  const norm = normalizeTreasureDescription(props.description);
  const withLetterQ = applyLetterQCopyToDescSegments(norm);
  const polished = props.polishTreasureCopy ? polishTreasureDescriptionSegments(withLetterQ) : withLetterQ;
  const expanded = expandEffectTokensInDescription(polished);
  const withRarity = expandRarityLabelsInDescription(expanded);
  const withProb = resolveDescriptionProbabilityDisplay(withRarity, {
    probabilityDoublerCount: props.probabilityDoublerCount,
  });
  return injectLineBreaksBeforeParentheses(withProb);
});
</script>

<style scoped>
.treasure-desc-rich {
  margin: 0;
}
</style>
