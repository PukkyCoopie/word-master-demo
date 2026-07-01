<template>
  <span class="collection-leaderboard-score-stat">{{
    displayText
  }}</span>
</template>

<script setup>
import { computed } from "vue";
import {
  formatCollectionLeaderboardScoreLocale,
  formatCollectionLeaderboardScoreScientific,
} from "../../collection/collectionLeaderboardScoreFormat.js";
import { shouldFormatScoreAsScientificDirect } from "../../utils/scoreNumericFormat.js";

const props = defineProps({
  score: { type: Number, default: 0 },
});

const displayText = computed(() => {
  const rounded = Math.round(Number(props.score) || 0);
  if (!Number.isFinite(rounded) || rounded === 0) return "0";
  if (shouldFormatScoreAsScientificDirect(rounded)) {
    return formatCollectionLeaderboardScoreScientific(rounded);
  }
  return formatCollectionLeaderboardScoreLocale(rounded);
});
</script>

<style scoped>
.collection-leaderboard-score-stat {
  display: block;
  width: 100%;
  box-sizing: border-box;
}
</style>
