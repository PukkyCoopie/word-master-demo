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
import {
  expandEffectTokensInDescription,
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
  /** 已拥有打字机（45）时：简介 prob chip 由基础分数改为翻倍（如 1/3→2/3） */
  probabilityDisplayDoubled: { type: Boolean, default: false },
});

const segments = computed(() => {
  const norm = normalizeTreasureDescription(props.description);
  const polished = props.polishTreasureCopy ? polishTreasureDescriptionSegments(norm) : norm;
  const expanded = expandEffectTokensInDescription(polished);
  const withProb = resolveDescriptionProbabilityDisplay(expanded, {
    probabilityDisplayDoubled: props.probabilityDisplayDoubled,
  });
  return injectLineBreaksBeforeParentheses(withProb);
});
</script>

<style scoped>
.treasure-desc-rich {
  margin: 0;
}
</style>
