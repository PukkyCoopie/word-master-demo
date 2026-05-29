<template>
  <div class="game-wrap">
    <div class="game-scaler">
      <div
        class="game-surface"
        :class="{
          'game-surface--menu': showMenu,
          'game-surface--run-start-open': showRunStartDialog,
        }"
      >
        <div v-if="dictGate" class="dict-boot-gate">
          <div
            class="dict-boot-bar"
            :class="{ 'dict-boot-bar--error': dictBootError, 'dict-boot-bar--clickable': dictBootError }"
            :title="dictBootError ? '点击重试' : undefined"
            role="progressbar"
            :aria-valuenow="dictBarPct"
            aria-valuemin="0"
            aria-valuemax="100"
            @click="onDictBootBarClick"
          >
            <div class="dict-boot-bar-fill" :style="{ width: dictBarPct + '%' }" />
          </div>
        </div>
        <MainMenu
          v-if="showMenu"
          :profile-layer-open="showPlayerProfile"
          @request-start="onMenuRequestStart"
          @open-profile="openPlayerProfile"
          @open-settings="openSettings"
          @open-about="openAbout"
        />
        <div v-else-if="showGame" class="game-session-stack">
          <GamePanel
            :key="gameSessionKey"
            :run-seed="sessionRunSeed"
            :run-seed-display="sessionRunSeedDisplay"
            :restored-save="sessionRestoredSave"
            :save-slot-index="sessionSaveSlotIndex"
            @request-restart="onGameRequestRestart"
            @exit-to-menu="onGameExitToMenu"
          />
        </div>
      </div>
    </div>
    <Teleport to="#game-view-portal">
      <IrisTransition ref="irisFxRef" :color="IRIS_COLOR" />
    </Teleport>
    <Teleport defer to="#game-view-portal-frame">
      <RunStartDialog
        :open="showRunStartDialog"
        :initial-seed="runStartPrefillSeed"
        @confirm="onRunStartConfirm"
        @cancel="onRunStartCancel"
      />
      <SettingsLayer :open="showSettings" @close="closeSettings" />
      <AboutLayer :open="showAbout" @close="closeAbout" />
      <PlayerProfileLayer
        :open="showPlayerProfile"
        :origin-rects="profileOpenOrigin"
        :active-slot="activeSaveSlotIndex"
        :refresh-key="saveUiRefreshKey"
        @close="closePlayerProfile"
        @switch-save="openSaveSlotsFromProfile"
      />
      <SaveSlotLayer
        :open="showSaveSlots"
        :mode="saveSlotMode"
        :active-slot="activeSaveSlotIndex"
        :refresh-key="saveUiRefreshKey"
        @close="closeSaveSlots"
        @select="onSaveSlotSelect"
      />
    </Teleport>
    <Teleport to="body">
      <TapTapPromoIcon
        v-if="showTapTapDesktopPromo"
        desktop
        viewport-fixed
        @open-poster="openTapTapPoster"
      />
      <TapTapPosterLayer
        v-if="tapTapWebPromoEnabled"
        :open="showTapTapPoster"
        @close="showTapTapPoster = false"
      />
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import MainMenu from "./components/MainMenu.vue";
import GamePanel from "./components/GamePanel.vue";
import RunStartDialog from "./components/RunStartDialog.vue";
import SettingsLayer from "./components/SettingsLayer.vue";
import AboutLayer from "./components/AboutLayer.vue";
import PlayerProfileLayer from "./components/PlayerProfileLayer.vue";
import SaveSlotLayer from "./components/SaveSlotLayer.vue";
import { loadGameSettings } from "./settings/gameSettings.js";
import { useScale } from "./composables/useScale";
import { usePortalFrameSync } from "./composables/usePortalFrameSync.js";
import { useDictionary } from "./composables/useDictionary";
import { useRemixIconFont } from "./composables/useRemixIconFont.js";
import { useTapTapAuth } from "./composables/useTapTapAuth.js";
import IrisTransition from "./components/IrisTransition.vue";
import { coerceRunSeedNumeric } from "./game/runRng.js";
import { isE2eMode } from "./e2e/isE2eMode.js";
import { registerAppTestHarness } from "./e2e/registerAppTestHarness.js";
import TapTapPromoIcon from "./components/TapTapPromoIcon.vue";
import TapTapPosterLayer from "./components/TapTapPosterLayer.vue";
import { isTapTapWebPromoEnabled } from "./taptap/tapTapWebPromo.js";
import { useWebLayoutMode } from "./composables/useWebLayoutMode.js";
import {
  applyProfileDefaultsFromTapTap,
  getActiveSaveSlotIndex,
  initializeProfileFromTapTap,
  isSlotProfileActivated,
  loadPlayerProfile,
  playerProfile,
  setActiveSaveSlotIndex,
} from "./profile/playerProfile.js";
import {
  clearSlot,
  getSlotPayload,
  isSlotOccupied,
  loadSaveEnvelope,
} from "./save/runSaveStorage.js";
import {
  mergeRunMatchStatsIntoCareer,
  normalizeSlotCareerStats,
} from "./save/slotCareerStats.js";

useScale();
const { isDesktopLayout } = useWebLayoutMode();
usePortalFrameSync();
const { loadDictionary, dictionaryReady, loading: dictLoading, error: dictError, loadProgress } = useDictionary();
const { remixIconReady, loadRemixIconFont } = useRemixIconFont();
const { account, phase: tapTapPhase } = useTapTapAuth();

const screen = ref("menu");
const gameSessionKey = ref(0);
const showRunStartDialog = ref(false);
const showSettings = ref(false);
const showAbout = ref(false);
const showPlayerProfile = ref(false);
/** @type {import('vue').Ref<{ chip: DOMRect, avatar: DOMRect | null, name: DOMRect | null } | null>} */
const profileOpenOrigin = ref(null);
const showSaveSlots = ref(false);
/** @type {import('vue').Ref<'select' | 'load'>} */
const saveSlotMode = ref("select");
/** @type {import('vue').Ref<'menu' | 'restart'>} */
const runStartMode = ref("menu");
/** @type {import('vue').Ref<number | null>} */
const pendingNewRunSlotIndex = ref(null);
const sessionRunSeed = ref(0);
const sessionRunSeedDisplay = ref("");
/** @type {import('vue').Ref<import('./save/runSavePayload.js').RunSavePayload | null>} */
const sessionRestoredSave = ref(null);
const sessionSaveSlotIndex = ref(0);
const runStartPrefillSeed = ref("");
const saveUiRefreshKey = ref(0);
const IRIS_COLOR = "#5a8fb8";
const irisFxRef = ref(null);
const transitionBusy = ref(false);
const showTapTapPoster = ref(false);
const tapTapWebPromoEnabled = isTapTapWebPromoEnabled();

const activeSaveSlotIndex = computed(() => getActiveSaveSlotIndex());

const showTapTapDesktopPromo = computed(
  () => tapTapWebPromoEnabled && isDesktopLayout.value,
);

provide("irisTransition", {
  play: (opts) => irisFxRef.value?.play(opts),
});

provide("requestNewRun", (opts = {}) => {
  if (transitionBusy.value) return;
  runStartPrefillSeed.value = String(opts.prefillSeed ?? "").trim();
  runStartMode.value = "restart";
  pendingNewRunSlotIndex.value = sessionSaveSlotIndex.value;
  showRunStartDialog.value = true;
});

provide("activeSaveSlotIndex", activeSaveSlotIndex);

provide("mergeCareerOnRunEnd", ({ outcome, stats }) => {
  const ix = sessionSaveSlotIndex.value;
  const slot = loadSaveEnvelope().slots[ix];
  if (!slot) return;
  const career = normalizeSlotCareerStats(slot.career);
  mergeRunMatchStatsIntoCareer(career, stats, outcome);
  const envelope = structuredClone(loadSaveEnvelope());
  if (envelope.slots[ix]) {
    envelope.slots[ix].career = career;
    try {
      localStorage.setItem("word_master_run_saves_v1", JSON.stringify(envelope));
      loadSaveEnvelope();
      bumpSaveUi();
    } catch {
      /* ignore */
    }
  }
});

function openSettings() {
  showSettings.value = true;
}

function closeSettings() {
  showSettings.value = false;
}

function openAbout() {
  showAbout.value = true;
}

function closeAbout() {
  showAbout.value = false;
}

function openTapTapPoster() {
  showTapTapPoster.value = true;
}

provide("openSettings", openSettings);
provide("closeSettings", closeSettings);
provide("openTapTapPoster", openTapTapPoster);

/** @param {{ chip: DOMRect, avatar: DOMRect | null, name: DOMRect | null, chipPaint?: { backgroundColor: string, boxShadow: string } } | null} [originRects] */
function openPlayerProfile(originRects) {
  profileOpenOrigin.value = originRects ?? null;
  showPlayerProfile.value = true;
}

function closePlayerProfile() {
  showPlayerProfile.value = false;
  profileOpenOrigin.value = null;
}

function openSaveSlotsFromProfile() {
  saveSlotMode.value = "select";
  showSaveSlots.value = true;
}

function closeSaveSlots() {
  showSaveSlots.value = false;
  pendingNewRunSlotIndex.value = null;
}

function bumpSaveUi() {
  saveUiRefreshKey.value += 1;
}

/** @param {{ index: number, mode: string }} payload */
function onSaveSlotSelect(payload) {
  const { index, mode } = payload;
  if (mode === "delete") {
    clearSlot(index);
    bumpSaveUi();
    return;
  }
  if (mode === "select") {
    setActiveSaveSlotIndex(index);
    if (!isSlotOccupied(index) && !isSlotProfileActivated(index)) {
      void applyProfileDefaultsFromTapTap(account.value, index);
    }
    bumpSaveUi();
    showSaveSlots.value = false;
    return;
  }
  if (mode === "load") {
    startLoadSlot(index);
    showSaveSlots.value = false;
  }
}

async function startLoadSlot(index) {
  const payload = getSlotPayload(index);
  if (!payload) return;
  sessionRestoredSave.value = payload;
  sessionSaveSlotIndex.value = index;
  setActiveSaveSlotIndex(index);
  sessionRunSeed.value = coerceRunSeedNumeric(payload.runSeedNumeric);
  sessionRunSeedDisplay.value = String(payload.runSeedDisplay ?? "");
  transitionBusy.value = true;
  await irisFxRef.value?.play({
    onCovered: () => {
      gameSessionKey.value += 1;
      screen.value = "game";
    },
  });
  transitionBusy.value = false;
}

async function startNewRunAtSlot(index, seedNumeric, seedDisplay, resetProfile = false) {
  sessionRestoredSave.value = null;
  sessionSaveSlotIndex.value = index;
  setActiveSaveSlotIndex(index);
  if (resetProfile) {
    await applyProfileDefaultsFromTapTap(account.value, index);
  }
  sessionRunSeed.value = coerceRunSeedNumeric(seedNumeric);
  sessionRunSeedDisplay.value = String(seedDisplay ?? "");
  transitionBusy.value = true;
  await irisFxRef.value?.play({
    onCovered: () => {
      gameSessionKey.value += 1;
      screen.value = "game";
    },
  });
  transitionBusy.value = false;
}

const appBootReady = computed(() => dictionaryReady.value && remixIconReady.value);
const showMenu = computed(() => appBootReady.value && screen.value === "menu");
const showGame = computed(() => appBootReady.value && screen.value === "game");
const dictGate = computed(() => !appBootReady.value);
const dictBootError = computed(() => !dictLoading.value && !!dictError.value);
const dictBarPct = computed(() => {
  if (dictBootError.value) return 100;
  const dictPct = loadProgress.value;
  if (!remixIconReady.value) {
    return Math.round(Math.min(dictPct, 0.99) * 100);
  }
  return Math.round(dictPct * 100);
});

let appAlive = true;
let disposeAppE2eHarness = null;
let profileInitDone = false;

async function maybeInitProfile() {
  if (profileInitDone || !appBootReady.value) return;
  if (tapTapPhase.value !== "ready" && !isE2eMode()) return;
  profileInitDone = true;
  if (!playerProfile.initialized) {
    await initializeProfileFromTapTap(account.value);
  }
}

watch([appBootReady, tapTapPhase], () => {
  void maybeInitProfile();
});

onMounted(() => {
  loadGameSettings();
  loadPlayerProfile();
  loadSaveEnvelope();
  loadDictionary({ shouldAbort: () => !appAlive });
  loadRemixIconFont({ shouldAbort: () => !appAlive });
  void maybeInitProfile();
  if (isE2eMode()) {
    disposeAppE2eHarness = registerAppTestHarness({
      screen,
      gameSessionKey,
      sessionRunSeed,
      sessionRunSeedDisplay,
      dictionaryReady,
      remixIconReady,
      loadDictionary: () => loadDictionary({ shouldAbort: () => !appAlive }),
      loadRemixIconFont: () => loadRemixIconFont({ shouldAbort: () => !appAlive }),
    });
  }
});

onBeforeUnmount(() => {
  disposeAppE2eHarness?.();
  disposeAppE2eHarness = null;
  appAlive = false;
});

function onDictBootBarClick() {
  if (!dictBootError.value) return;
  loadDictionary({ shouldAbort: () => !appAlive });
}

function onMenuRequestStart() {
  if (transitionBusy.value) return;
  const ix = getActiveSaveSlotIndex();
  if (isSlotOccupied(ix)) {
    void startLoadSlot(ix);
    return;
  }
  runStartPrefillSeed.value = "";
  runStartMode.value = "menu";
  pendingNewRunSlotIndex.value = ix;
  showRunStartDialog.value = true;
}

async function onRunStartConfirm(payload) {
  if (transitionBusy.value) return;
  const seedNumeric = coerceRunSeedNumeric(payload.seedNumeric);
  const seedDisplay = String(payload.seedDisplay ?? "");
  runStartPrefillSeed.value = "";
  showRunStartDialog.value = false;

  const slotIx =
    pendingNewRunSlotIndex.value != null ? pendingNewRunSlotIndex.value : getActiveSaveSlotIndex();
  pendingNewRunSlotIndex.value = null;

  if (runStartMode.value === "menu" && !isSlotOccupied(slotIx)) {
    const resetProfile = !isSlotProfileActivated(slotIx);
    await startNewRunAtSlot(slotIx, seedNumeric, seedDisplay, resetProfile);
    runStartMode.value = "menu";
    return;
  }

  if (runStartMode.value === "restart" && isSlotOccupied(slotIx)) {
    clearSlot(slotIx);
    bumpSaveUi();
  }

  sessionRestoredSave.value = null;
  sessionRunSeed.value = seedNumeric;
  sessionRunSeedDisplay.value = seedDisplay;
  sessionSaveSlotIndex.value = slotIx;
  transitionBusy.value = true;
  const mode = runStartMode.value;
  await irisFxRef.value?.play({
    onCovered: () => {
      gameSessionKey.value += 1;
      if (mode === "menu" || mode === "restart") screen.value = "game";
    },
  });
  transitionBusy.value = false;
  runStartMode.value = "menu";
}

function onRunStartCancel() {
  showRunStartDialog.value = false;
  runStartPrefillSeed.value = "";
  pendingNewRunSlotIndex.value = null;
}

function onGameRequestRestart(payload) {
  if (transitionBusy.value) return;
  runStartPrefillSeed.value = payload?.prefillSeed ? sessionRunSeedDisplay.value : "";
  runStartMode.value = "restart";
  pendingNewRunSlotIndex.value = sessionSaveSlotIndex.value;
  showRunStartDialog.value = true;
}

async function onGameExitToMenu() {
  if (transitionBusy.value) return;
  sessionRestoredSave.value = null;
  transitionBusy.value = true;
  await irisFxRef.value?.play({
    onCovered: () => {
      screen.value = "menu";
      bumpSaveUi();
    },
  });
  transitionBusy.value = false;
}

</script>

<style scoped>
.game-surface {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(12 * var(--rpx));
}

.game-surface--run-start-open {
  overflow: visible;
}

.game-session-stack {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}

.dict-boot-gate {
  position: absolute;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  pointer-events: none;
}

.dict-boot-bar {
  width: min(78%, calc(560 * var(--rpx)));
  height: calc(14 * var(--rpx));
  border-radius: calc(7 * var(--rpx));
  background: var(--card-bright);
  box-shadow: inset 0 calc(1 * var(--rpx)) 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.dict-boot-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: #5a8fb8;
  transition: width 0.12s ease-out, background 0.2s ease;
}

.dict-boot-bar--error .dict-boot-bar-fill {
  background: var(--btn-red);
}

.dict-boot-bar--clickable {
  pointer-events: auto;
  cursor: pointer;
}
</style>
