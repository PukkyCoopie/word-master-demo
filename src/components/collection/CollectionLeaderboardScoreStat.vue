<template>
  <span class="collection-leaderboard-score-stat">{{
    displayText
  }}</span>
</template>

<script setup>
import { computed } from "vue";
import { formatIntegerScoreForDisplay } from "../../utils/scoreNumericFormat.js";

const props = defineProps({
  score: { type: Number, default: 0 },
});

const displayText = computed(() => formatIntegerScoreForDisplay(props.score));
</script>

<style scoped>
.collection-leaderboard-score-stat {
  display: block;
  width: 100%;
  box-sizing: border-box;
}
</style>
