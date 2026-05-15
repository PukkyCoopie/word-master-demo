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
} from "../treasures/treasureDescription.js";

const props = defineProps({
  /** @type {import('../treasures/treasureDescription.js').TreasureDescSegment[] | string | undefined} */
  description: { type: [Array, String], default: () => [] },
  /** 分节正文（配饰 / tile）：与 `.treasure-detail-desc-panel-body` 排版一致并居中 */
  panelBody: { type: Boolean, default: false },
});

const segments = computed(() => {
  const norm = normalizeTreasureDescription(props.description);
  const expanded = expandEffectTokensInDescription(norm);
  return injectLineBreaksBeforeParentheses(expanded);
});
</script>

<style scoped>
.treasure-desc-rich {
  margin: 0;
}
</style>
