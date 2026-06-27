<script setup>
import { computed, inject, ref, watch, onUnmounted } from "vue";
import { useViewportLayoutMode } from "../../composables/useViewportLayoutMode.js";
import { RUN_SESSION_KEY } from "../../runSession/useRunSession.js";
import RunEndLayer from "../RunEndLayer.vue";
import EndlessDifficultyLeaderboardHintLayer from "../EndlessDifficultyLeaderboardHintLayer.vue";
import { createRunEndConfettiController } from "../../game/runEndConfetti.js";
import {
  formatRunEndBestWordValue,
  formatRunEndBestWordLengthValue,
  formatRunEndLongestWordValue,
  formatRunEndMostCommonLength,
  getRunEndTripleStatsRows,
} from "../../game/runMatchStats.js";
import { buildRunDiscoveryDisplayItems } from "../../game/runCollectionDiscoveries.js";

/** @type {import('../../runSession/runSessionTypes.js').RunSession} */
const session = inject(RUN_SESSION_KEY);
const runEnd = session?.ui?.runEnd;
const overlayStack = session?.overlayStack;
if (!runEnd) {
  throw new Error("RunEndFlowHost: session.ui.runEnd missing");
}
if (!overlayStack?.bumpOverlayZ) {
  throw new Error("RunEndFlowHost: session.overlayStack.bumpOverlayZ missing");
}

const { portalFullscreenTarget } = useViewportLayoutMode();

const runEndConfettiCanvasRef = ref(/** @type {HTMLCanvasElement | null} */ (null));
const runEndConfettiController = createRunEndConfettiController({
  getCanvasEl: () => runEndConfettiCanvasRef.value,
});

const showEndlessDifficulty0Hint = ref(false);
const endlessDifficulty0HintPortalZ = ref(0);

const isOpen = computed(() => runEnd.open.value);
const outcome = computed(() => runEnd.outcome.value);
const portalStackStyle = computed(() => runEnd.portalStackStyle.value);
const runSeedDisplay = computed(() => runEnd.runSeedDisplay.value);
const reachedLevelId = computed(() => runEnd.reachedLevelId.value);
const runDifficultyIndex = computed(() => runEnd.runDifficultyIndex.value);

const runEndConfettiPortalStackStyle = computed(() => {
  const stackStyle = portalStackStyle.value;
  const base = stackStyle?.zIndex;
  if (base == null || base === "") return stackStyle;
  const z = Number(base);
  return Number.isFinite(z) ? { ...stackStyle, zIndex: z + 1 } : stackStyle;
});

const endlessDifficulty0HintPortalStackStyle = computed(() =>
  endlessDifficulty0HintPortalZ.value > 0 ? { zIndex: endlessDifficulty0HintPortalZ.value } : undefined,
);

const bestWordValue = computed(() => formatRunEndBestWordValue(runEnd.runMatchStats.value));
const bestWordLengthValue = computed(() => formatRunEndBestWordLengthValue(runEnd.runMatchStats.value));
const longestWordValue = computed(() => formatRunEndLongestWordValue(runEnd.runMatchStats.value));
const mostCommonLengthValue = computed(() => formatRunEndMostCommonLength(runEnd.runMatchStats.value));
const tripleStatsRows = computed(() => getRunEndTripleStatsRows(runEnd.runMatchStats.value));
const discoveryItems = computed(() => buildRunDiscoveryDisplayItems(runEnd.runDiscoveryLog.value));

function triggerConfettiWin() {
  runEndConfettiController.triggerWin();
}

function disposeConfetti() {
  runEndConfettiController.dispose();
}

function onEndlessClick() {
  if (runDifficultyIndex.value <= 0) {
    endlessDifficulty0HintPortalZ.value = overlayStack.bumpOverlayZ();
    showEndlessDifficulty0Hint.value = true;
    return;
  }
  void runEnd.onEnterEndless();
}

function onEndlessHintConfirm() {
  showEndlessDifficulty0Hint.value = false;
  void runEnd.onEnterEndless();
}

/** @param {object} payload */
function onDiscoverySelect(payload) {
  runEnd.onSelectDiscovery(payload);
}

watch(isOpen, (open) => {
  if (!open) showEndlessDifficulty0Hint.value = false;
});

defineExpose({
  triggerConfettiWin,
  disposeConfetti,
});

onUnmounted(() => {
  disposeConfetti();
});
</script>

<template>
  <Teleport defer :to="portalFullscreenTarget">
    <canvas
      v-if="isOpen && outcome === 'win'"
      ref="runEndConfettiCanvasRef"
      class="portal-overlay-viewport run-end-confetti-canvas"
      :style="runEndConfettiPortalStackStyle"
      aria-hidden="true"
    />
  </Teleport>

  <Teleport defer to="#game-view-portal-frame">
    <RunEndLayer
      :open="isOpen"
      :outcome="outcome"
      :run-seed-display="runSeedDisplay"
      :reached-level-id="reachedLevelId"
      :best-word-value="bestWordValue"
      :best-word-length-value="bestWordLengthValue"
      :longest-word-value="longestWordValue"
      :most-common-length-value="mostCommonLengthValue"
      :triple-stats-rows="tripleStatsRows"
      :discovery-items="discoveryItems"
      :portal-stack-style="portalStackStyle"
      @retry="runEnd.onRetry()"
      @main-menu="runEnd.onMainMenu()"
      @endless="onEndlessClick"
      @select-discovery="onDiscoverySelect"
    />
    <EndlessDifficultyLeaderboardHintLayer
      :open="showEndlessDifficulty0Hint"
      :portal-stack-style="endlessDifficulty0HintPortalStackStyle"
      @confirm="onEndlessHintConfirm"
    />
  </Teleport>
</template>

<style scoped>
.run-end-confetti-canvas {
  width: 100%;
  height: 100%;
  pointer-events: none;
}
</style>
