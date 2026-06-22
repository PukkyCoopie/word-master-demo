<template>
  <span ref="wrapRef" class="collection-leaderboard-score-stat">{{
    displayText
  }}</span>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  formatCollectionLeaderboardScoreLocale,
  formatCollectionLeaderboardScoreScientific,
} from "../../collection/collectionLeaderboardScoreFormat.js";

const props = defineProps({
  score: { type: Number, default: 0 },
});

const wrapRef = ref(null);
const displayText = ref("0");

/** @type {ResizeObserver | null} */
let resizeObserver = null;

function refit() {
  const wrap = wrapRef.value;
  if (!wrap) return;

  const width = wrap.clientWidth;
  if (width <= 0) return;

  const localeText = formatCollectionLeaderboardScoreLocale(props.score);
  wrap.textContent = localeText;
  if (wrap.scrollWidth <= width + 0.5) {
    displayText.value = localeText;
    return;
  }

  displayText.value = formatCollectionLeaderboardScoreScientific(props.score);
}

function scheduleRefit() {
  nextTick(refit);
}

onMounted(() => {
  scheduleRefit();
  const wrap = wrapRef.value;
  if (wrap && typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => scheduleRefit());
    resizeObserver.observe(wrap);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

watch(() => props.score, scheduleRefit);
</script>

<style scoped>
.collection-leaderboard-score-stat {
  display: block;
  width: 100%;
  box-sizing: border-box;
}
</style>
