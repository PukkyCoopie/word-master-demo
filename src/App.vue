<template>
  <div class="game-wrap">
    <div class="game-scaler">
      <div
        class="game-surface"
        :class="{
          'game-surface--menu': showMenu,
          'game-surface--collection': showCollection,
          'game-surface--run-start-open': showRunStartDialog,
        }"
      >
        <div v-if="dictGate" class="dict-boot-gate">
          <div class="dict-boot-panel">
            <div
              class="dict-boot-bar"
              :class="{ 'dict-boot-bar--error': dictBootError, 'dict-boot-bar--clickable': dictBootError }"
              :title="dictBootError ? '点击重试' : undefined"
              role="progressbar"
              :aria-valuenow="dictBarPct"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-label="dictBootError ? dictBootErrorMessage : bootLoadStatusLabel"
              @click="onDictBootBarClick"
            >
              <div class="dict-boot-bar-fill" :style="{ width: dictBarPct + '%' }" />
            </div>
            <p v-if="dictBootError" class="dict-boot-error-msg">{{ dictBootErrorMessage }}</p>
            <p v-else class="dict-boot-status">{{ bootLoadStatusLabel }}</p>
          </div>
        </div>
        <MainMenu
          v-if="showMenu"
          :profile-layer-open="showPlayerProfile"
          :collection-progress-suffix="menuCollectionProgressSuffix"
          :save-ui-refresh-key="saveUiRefreshKey"
          @request-start="onMenuRequestStart"
          @open-profile="openPlayerProfile"
          @open-settings="openSettings"
          @open-about="openAbout"
          @open-collection="openCollection"
        />
        <CollectionPage
          v-else-if="showCollection"
          :career="collectionCareer"
          :initial-enter-delay-ms="COLLECTION_PAGE_INITIAL_ENTER_DELAY_MS"
          @back="closeCollection"
        />
        <div v-else-if="showGame" class="game-session-stack">
          <GamePanel
            :key="gameSessionKey"
            :run-seed="sessionRunSeed"
            :run-seed-display="sessionRunSeedDisplay"
            :run-preset-id="sessionRunPresetId"
            :run-difficulty-index="sessionRunDifficultyIndex"
            :restored-save="sessionRestoredSave"
            :save-slot-index="sessionSaveSlotIndex"
            @request-restart="onGameRequestRestart"
            @exit-to-menu="onGameExitToMenu"
          />
        </div>
      </div>
    </div>
    <Teleport to="#game-view-portal">
      <IrisTransition ref="irisFxRef" :color="irisTransitionColor" />
    </Teleport>
    <Teleport defer to="#game-view-portal-frame">
      <RunStartDialog
        :open="showRunStartDialog"
        :initial-seed="runStartPrefillSeed"
        :continue-snapshot="runStartContinueSnapshot"
        :slot-career="runStartSlotCareer"
        :fresh-unlock-preset-ids="runStartFreshUnlocks.presetIds"
        :fresh-unlock-difficulty-indices="runStartFreshUnlocks.difficultyIndices"
        @confirm="onRunStartConfirm"
        @cancel="onRunStartCancel"
      />
      <RunStartQuickConfirmLayer
        :open="runStartQuickConfirm.open"
        :kind="runStartQuickConfirm.kind"
        :title="runStartQuickConfirm.title"
        :message="runStartQuickConfirm.message"
        :confirm-label="runStartQuickConfirm.confirmLabel"
        :cancel-label="runStartQuickConfirm.cancelLabel"
        @confirm="onRunStartQuickConfirm"
        @cancel="onRunStartQuickCancel"
        @dismiss="onRunStartQuickDismiss"
      />
      <SettingsLayer :open="showSettings" @close="closeSettings" />
      <AboutLayer
        :open="showAbout"
        @close="closeAbout"
        @enable-developer-mode="enableDeveloperMode"
        @open-material-bench="openMaterialBench"
        @open-privacy="openPrivacyPolicyView"
      />
      <PrivacyConsentLayer
        :open="showPrivacyConsent"
        :mode="privacyConsentMode"
        @agree="onPrivacyConsentAgree"
        @decline="onPrivacyConsentDecline"
        @close="closePrivacyConsentView"
      />
      <AchievementToastLayer :queue="achievementToastQueue" />
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
      <CloudSaveConflictLayer
        :open="cloudSaveUiState.conflictOpen"
        :local-bundle="cloudSaveUiState.localBundle"
        :cloud-bundle="cloudSaveUiState.cloudBundle"
        @use-cloud="onCloudSaveUseCloud"
        @use-local="onCloudSaveUseLocal"
        @defer="onCloudSaveDefer"
      />
      <CloudSaveForeignLocalLayer
        :open="cloudSaveUiState.foreignLocalOpen"
        :local-bundle="cloudSaveUiState.foreignLocalBundle"
        @continue="onCloudSaveForeignLocalContinue"
        @new-save="onCloudSaveForeignLocalNew"
      />
    </Teleport>
    <Teleport to="body">
      <MaterialPerfBench v-if="showMaterialBench" @close="showMaterialBench = false" />
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
import { Capacitor } from "@capacitor/core";
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import MainMenu from "./components/MainMenu.vue";
import CollectionPage from "./components/CollectionPage.vue";
import GamePanel from "./components/GamePanel.vue";
import RunStartDialog from "./components/RunStartDialog.vue";
import RunStartQuickConfirmLayer from "./components/RunStartQuickConfirmLayer.vue";
import SettingsLayer from "./components/SettingsLayer.vue";
import AboutLayer from "./components/AboutLayer.vue";
import PrivacyConsentLayer from "./components/PrivacyConsentLayer.vue";
import PlayerProfileLayer from "./components/PlayerProfileLayer.vue";
import SaveSlotLayer from "./components/SaveSlotLayer.vue";
import CloudSaveConflictLayer from "./components/CloudSaveConflictLayer.vue";
import CloudSaveForeignLocalLayer from "./components/CloudSaveForeignLocalLayer.vue";
import { cloudSaveUiState } from "./save/cloudSave/cloudSaveState.js";
import {
  resolveCloudSaveDefer,
  resolveCloudSaveForeignLocalContinue,
  resolveCloudSaveForeignLocalNew,
  resolveCloudSaveUseCloud,
  resolveCloudSaveUseLocal,
  setCloudSaveAppliedCallback,
} from "./save/cloudSave/cloudSaveSync.js";
import { initAppLifecycle, disposeAppLifecycle } from "./platform/appLifecycle.js";
import { loadGameSettings } from "./settings/gameSettings.js";
import { useScale } from "./composables/useScale";
import { usePortalFrameSync } from "./composables/usePortalFrameSync.js";
import { useDictionary } from "./composables/useDictionary";
import { formatDictionaryLoadErrorForPlayer } from "./dictionary/dictionaryBootErrorCopy.js";
import { useRemixIconFont } from "./composables/useRemixIconFont.js";
import { onPrivacyConsentGrantedForAuth, TAP_TAP_AUTH_MENU_ONLY_PHASES, useTapTapAuth } from "./composables/useTapTapAuth.js";
import { ensureTapTapSdkInitialized } from "./taptap/tapTapPlugin.js";
import {
  hasPrivacyConsent,
  isPrivacyConsentRequired,
  markPrivacyConsentAgreed,
  privacyConsentGranted,
} from "./privacy/privacyConsent.js";
import IrisTransition from "./components/IrisTransition.vue";
import {
  resumeGamePauseGsapFreeze,
  suspendGamePauseGsapFreeze,
} from "./game/gamePause.js";
import { coerceRunSeedNumeric, resolveRunSeedFromDialog } from "./game/runRng.js";
import { resetTapTapAchievementBootstrap } from "./achievements/achievementTapTapSync.js";
import { isMaterialBenchEnabled } from "./dev/materialBenchGate.js";
import { registerDevConsole } from "./dev/registerDevConsole.js";
import MaterialPerfBench from "./dev/MaterialPerfBench.vue";
import { isE2eMode } from "./e2e/isE2eMode.js";
import { registerAppTestHarness } from "./e2e/registerAppTestHarness.js";
import TapTapPromoIcon from "./components/TapTapPromoIcon.vue";
import TapTapPosterLayer from "./components/TapTapPosterLayer.vue";
import { isTapTapWebPromoEnabled } from "./taptap/tapTapWebPromo.js";
import {
  markTapTapEngagementAutoPending,
  shouldMarkTapTapEngagementAutoPending,
} from "./taptap/tapTapEngagementPrompt.js";
import { openTapTapEngagementLayer } from "./taptap/tapTapEngagementUi.js";
import { useWebLayoutMode } from "./composables/useWebLayoutMode.js";
import {
  applyProfileDefaultsFromTapTap,
  ensureSlotProfileActivated,
  getActiveSaveSlotIndex,
  initializeProfileFromTapTap,
  isSlotProfileActivated,
  loadPlayerProfile,
  playerProfile,
  repairSlotProfilesAfterLoad,
  resetSlotProfile,
  setActiveSaveSlotIndex,
} from "./profile/playerProfile.js";
import {
  clearSlot,
  clearSlotRunProgress,
  getSlotCareer,
  getSlotMeta,
  getSlotPayload,
  hasAbandonedFreshRun,
  hasContinuableRun,
  isSlotOccupied,
  loadSaveEnvelope,
  mutateSlotCareer,
  pruneAbandonedFreshRun,
} from "./save/runSaveStorage.js";
import {
  recordAccessoryDiscovered,
  recordMaterialDiscovered,
  recordSpellDiscovered,
  recordUpgradeDiscovered,
  recordTreasureDiscovered,
  recordPrerequisiteTreasureShopAppeared,
  recordVoucherDiscovered,
  tryInsertLengthLeaderboard,
  tryInsertScoreLeaderboard,
} from "./collection/collectionCareer.js";
import { buildSubmitWordRecord } from "./collection/collectionWordRecord.js";
import {
  hasSlotCompletedAnyRun,
  mergeRunMatchStatsIntoCareer,
  normalizeSlotCareerStats,
  recordCareerRunStarted,
} from "./save/slotCareerStats.js";
import { normalizeRunPresetId } from "./game/runPresetDefinitions.js";
import { normalizeRunDifficultyIndex } from "./game/runDifficultyDefinitions.js";
import {
  getLastSelectedDifficultyBrowseIndex,
  recordDifficultyWin,
  setLastSelectedDifficultyIndex,
} from "./game/runDifficultyProgress.js";
import {
  getLastSelectedPresetId,
  recordPresetWin,
  setLastSelectedPresetId,
} from "./game/runPresetProgress.js";
import {
  applyFreshUnlockCareerDefaults,
  collectFreshUnlocksFromWin,
} from "./game/runStartFreshUnlock.js";
import { createEmptySlotCareerStats, SAVE_SLOT_COUNT } from "./save/runSaveSchema.js";
import { ACHIEVEMENT_DEFINITIONS, getAchievementDef } from "./achievements/achievementDefinitions.js";
import { createAchievementToastQueue } from "./achievements/achievementToastQueue.js";
import { tryUnlockAchievementsInCareer } from "./achievements/achievementUnlock.js";
import {
  bootstrapTapTapAchievements,
  reportTapTapAchievementUnlocks,
  syncTapTapIncrementProgressInCareer,
} from "./achievements/achievementTapTapSync.js";
import AchievementToastLayer from "./components/AchievementToastLayer.vue";
import { applyDeveloperAchievementCheat } from "./dev/developerAchievementCheats.js";
import { developerModeEnabled, enableDeveloperMode } from "./dev/developerMode.js";
import { formatCollectionMenuProgressSuffix } from "./collection/collectionProgress.js";
import { registerAndroidBackHandler } from "./platform/androidBackButton.js";
import { handleAppAndroidBack } from "./platform/handleAppAndroidBack.js";
import { useBootImages } from "./composables/useBootImages.js";

useScale();
const { isDesktopLayout } = useWebLayoutMode();
usePortalFrameSync();
const { loadDictionary, dictionaryReady, loading: dictLoading, error: dictError, loadProgress } = useDictionary();
const { remixIconReady, loadRemixIconFont } = useRemixIconFont();
const {
  bootImagesReady,
  bootImageLoadProgress,
  bootPosterLoadProgress,
  bootAssetsLoadedCount,
  bootAssetsTotalCount,
  loadBootImages,
} = useBootImages();

/** 启动进度条：词库 / 图片 / TapTap 海报（仅 Web）/ Remix Icon 权重 */
const BOOT_PROGRESS_WEIGHT = Object.freeze({
  dictionary: 0.82,
  images: 0.10,
  poster: 0.03,
  remixIcon: 0.05,
});
const { account, phase: tapTapPhase } = useTapTapAuth();

const screen = ref("menu");
const gameSessionKey = ref(0);
const showRunStartDialog = ref(false);

watch(showRunStartDialog, (open) => {
  if (open) suspendGamePauseGsapFreeze();
  else resumeGamePauseGsapFreeze();
});
const showSettings = ref(false);
const showAbout = ref(false);
const showPrivacyConsent = ref(false);
/** @type {import('vue').Ref<'consent' | 'view'>} */
const privacyConsentMode = ref("consent");
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
const sessionRunPresetId = ref("preset_01");
const sessionRunDifficultyIndex = ref(0);
/** @type {import('vue').Ref<import('./save/runSavePayload.js').RunSavePayload | null>} */
const sessionRestoredSave = ref(null);
const sessionSaveSlotIndex = ref(0);
const runStartPrefillSeed = ref("");
const saveUiRefreshKey = ref(0);
const collectionRefreshKey = ref(0);
/** @type {import('vue').Ref<{ presetIds: string[], difficultyIndices: number[] }>} */
const runStartFreshUnlocks = ref({ presetIds: [], difficultyIndices: [] });
/** @type {import('vue').Ref<{ open: boolean, kind: 'continue' | 'new-run', slotIx: number, mode: 'menu' | 'restart', title: string, message: string, confirmLabel: string, cancelLabel: string }>} */
const runStartQuickConfirm = ref({
  open: false,
  kind: "continue",
  slotIx: 0,
  mode: "menu",
  title: "",
  message: "",
  confirmLabel: "",
  cancelLabel: "",
});
const IRIS_COLOR = "#5a8fb8";
const COLLECTION_IRIS_COLOR = "#7b68a8";
/** 与 IrisTransition revealMs 默认一致：收藏页首屏入场延后到 iris 揭开之后 */
const COLLECTION_PAGE_INITIAL_ENTER_DELAY_MS = 520;
const irisTransitionColor = ref(IRIS_COLOR);
const irisFxRef = ref(null);
const transitionBusy = ref(false);
const showTapTapPoster = ref(false);
const tapTapWebPromoEnabled = isTapTapWebPromoEnabled();

const activeSaveSlotIndex = computed(() => getActiveSaveSlotIndex());

const runStartContinueSnapshot = computed(() => {
  if (runStartMode.value !== "menu") return null;
  const ix = pendingNewRunSlotIndex.value ?? getActiveSaveSlotIndex();
  const meta = getSlotMeta(ix);
  if (!meta) return null;
  return {
    seedDisplay: meta.seedDisplay,
    levelId: meta.levelId,
    money: meta.money,
    isEndlessRun: meta.isEndlessRun === true,
    presetId: String(meta.runPresetId ?? "preset_01"),
    difficultyIndex: normalizeRunDifficultyIndex(meta.runDifficultyIndex),
    continueEnabled: hasContinuableRun(ix),
  };
});

const runStartSlotCareer = computed(() => {
  const ix = pendingNewRunSlotIndex.value ?? getActiveSaveSlotIndex();
  return normalizeSlotCareerStats(getSlotCareer(ix) ?? createEmptySlotCareerStats());
});

const showTapTapDesktopPromo = computed(
  () => tapTapWebPromoEnabled && isDesktopLayout.value,
);

provide("irisTransition", {
  play: (opts) => irisFxRef.value?.play(opts),
});

provide("requestNewRun", (opts = {}) => {
  openRunStartFlow({ mode: "restart", prefillSeed: String(opts.prefillSeed ?? "").trim() });
});

provide("activeSaveSlotIndex", activeSaveSlotIndex);

provide("mutateCollectionCareer", (mutator) => {
  persistCollectionCareer(getActiveSaveSlotIndex(), mutator);
});

provide("recordCollectionDiscovery", ({
  treasureId,
  spellId,
  upgradeId,
  voucherId,
  materialId,
  accessoryId,
} = {}) => {
  const ix = screen.value === "game" ? sessionSaveSlotIndex.value : getActiveSaveSlotIndex();
  let wasNew = false;
  persistCollectionCareer(ix, (career) => {
    if (treasureId) wasNew = recordTreasureDiscovered(career, treasureId) || wasNew;
    if (spellId) wasNew = recordSpellDiscovered(career, spellId) || wasNew;
    if (upgradeId) wasNew = recordUpgradeDiscovered(career, upgradeId) || wasNew;
    if (voucherId) wasNew = recordVoucherDiscovered(career, voucherId) || wasNew;
    if (materialId) wasNew = recordMaterialDiscovered(career, materialId) || wasNew;
    if (accessoryId) wasNew = recordAccessoryDiscovered(career, accessoryId) || wasNew;
  });
  return wasNew;
});

provide("recordPrerequisiteTreasureShopAppeared", (treasureId, opts) => {
  const ix = screen.value === "game" ? sessionSaveSlotIndex.value : getActiveSaveSlotIndex();
  persistCollectionCareer(ix, (career) => {
    recordPrerequisiteTreasureShopAppeared(career, treasureId, opts);
  });
});

provide("recordCollectionWordSubmit", ({ word, score, length, tiles, ownedTreasures }) => {
  const record = buildSubmitWordRecord({ word, score, length, tiles, ownedTreasures });
  persistCollectionCareer(sessionSaveSlotIndex.value, (career) => {
    tryInsertScoreLeaderboard(career, record);
    tryInsertLengthLeaderboard(career, record);
  });
});

provide("patchActiveSlotCareer", (mutator) => {
  persistCollectionCareer(sessionSaveSlotIndex.value, mutator);
});

provide("mergeCareerOnRunEnd", ({ outcome, stats, runPresetId, runDifficultyIndex }) => {
  const ix = sessionSaveSlotIndex.value;
  const slot = loadSaveEnvelope().slots[ix];
  if (!slot) return;
  const career = normalizeSlotCareerStats(slot.career);
  const careerBefore = normalizeSlotCareerStats(JSON.parse(JSON.stringify(career)));
  mergeRunMatchStatsIntoCareer(career, stats, outcome);
  if (shouldMarkTapTapEngagementAutoPending(career, outcome, runDifficultyIndex)) {
    markTapTapEngagementAutoPending(career);
  }
  if (outcome === "win") {
    const presetWinNew = recordPresetWin(career, normalizeRunPresetId(runPresetId));
    recordDifficultyWin(
      career,
      normalizeRunDifficultyIndex(runDifficultyIndex),
      normalizeRunPresetId(runPresetId),
    );
    const fresh = collectFreshUnlocksFromWin(careerBefore, career, presetWinNew);
    if (fresh.presetIds.length || fresh.difficultyIndices.length) {
      applyFreshUnlockCareerDefaults(career, fresh);
      runStartFreshUnlocks.value = {
        presetIds: [...new Set([...runStartFreshUnlocks.value.presetIds, ...fresh.presetIds])],
        difficultyIndices: [
          ...new Set([...runStartFreshUnlocks.value.difficultyIndices, ...fresh.difficultyIndices]),
        ],
      };
    }
  }
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

function openPrivacyPolicyView() {
  privacyConsentMode.value = "view";
  showPrivacyConsent.value = true;
}

function closePrivacyConsentView() {
  showPrivacyConsent.value = false;
}

async function onPrivacyConsentAgree() {
  markPrivacyConsentAgreed();
  try {
    await ensureTapTapSdkInitialized();
  } catch {
    /* 初始化失败不阻塞进入；TapTap 登录时再重试 */
  }
  showPrivacyConsent.value = false;
  onPrivacyConsentGrantedForAuth();
}

async function onPrivacyConsentDecline() {
  try {
    const { App } = await import("@capacitor/app");
    await App.exitApp();
  } catch {
    /* Web 预览等环境无法退出 */
  }
}

function maybeOpenPrivacyConsentOnBoot() {
  if (!appBootReady.value || !isPrivacyConsentRequired() || hasPrivacyConsent()) return;
  if (showPrivacyConsent.value) return;
  privacyConsentMode.value = "consent";
  showPrivacyConsent.value = true;
}

async function openCollection() {
  if (transitionBusy.value) return;
  transitionBusy.value = true;
  irisTransitionColor.value = COLLECTION_IRIS_COLOR;
  await irisFxRef.value?.play({
    onCovered: () => {
      screen.value = "collection";
    },
  });
  irisTransitionColor.value = IRIS_COLOR;
  transitionBusy.value = false;
}

async function closeCollection() {
  if (transitionBusy.value) return;
  transitionBusy.value = true;
  irisTransitionColor.value = COLLECTION_IRIS_COLOR;
  await irisFxRef.value?.play({
    onCovered: () => {
      screen.value = "menu";
    },
  });
  irisTransitionColor.value = IRIS_COLOR;
  transitionBusy.value = false;
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

function onCloudSaveApplied() {
  bumpSaveUi();
  collectionRefreshKey.value += 1;
  if (screen.value === "game") {
    sessionRestoredSave.value = null;
    screen.value = "menu";
  }
}

async function onCloudSaveUseCloud() {
  await resolveCloudSaveUseCloud();
}

async function onCloudSaveUseLocal() {
  await resolveCloudSaveUseLocal();
}

function onCloudSaveDefer() {
  resolveCloudSaveDefer();
}

async function onCloudSaveForeignLocalContinue() {
  await resolveCloudSaveForeignLocalContinue();
}

async function onCloudSaveForeignLocalNew() {
  await resolveCloudSaveForeignLocalNew();
  resetTapTapAchievementBootstrap();
}

function bumpCollectionUi() {
  collectionRefreshKey.value += 1;
  bumpSaveUi();
}

/**
 * @param {import('./achievements/achievementEvaluate.js').AchievementEvalContext} ctx
 * @returns {import('./achievements/achievementTypes.js').AchievementDefinition[]}
 */
const achievementToastQueue = createAchievementToastQueue();

function unlockAchievementsWithCtx(ctx) {
  const ix = screen.value === "game" ? sessionSaveSlotIndex.value : getActiveSaveSlotIndex();
  /** @type {import('./achievements/achievementTypes.js').AchievementDefinition[]} */
  let newly = [];
  mutateSlotCareer(ix, (career) => {
    newly = tryUnlockAchievementsInCareer(career, ctx);
    syncTapTapIncrementProgressInCareer(career);
  });
  if (newly.length) {
    bumpCollectionUi();
    achievementToastQueue.enqueue(newly);
  }
  void reportTapTapAchievementUnlocks(newly);
  return newly;
}

/** @param {string} achievementId */
function applyDeveloperAchievementCheatFromApp(achievementId) {
  if (!developerModeEnabled.value) return;

  const def = getAchievementDef(achievementId);
  if (!def) return;

  const ix = getActiveSaveSlotIndex();
  /** @type {import('./achievements/achievementTypes.js').AchievementDefinition[]} */
  let newly = [];
  mutateSlotCareer(ix, (career) => {
    newly = applyDeveloperAchievementCheat(career, def);
    syncTapTapIncrementProgressInCareer(career);
  });
  bumpSaveUi();
  if (newly.length) {
    achievementToastQueue.enqueue(newly);
    void reportTapTapAchievementUnlocks(newly);
  }
}

function collectAllUnlockedAchievementIds() {
  const ids = new Set();
  for (let i = 0; i < SAVE_SLOT_COUNT; i += 1) {
    for (const id of getSlotCareer(i).unlockedAchievementIds ?? []) {
      const trimmed = String(id ?? "").trim();
      if (trimmed) ids.add(trimmed);
    }
  }
  return ids;
}

watch(
  () => [tapTapPhase.value, account.value?.unionId, activeSaveSlotIndex.value, saveUiRefreshKey.value],
  ([phase, unionId]) => {
    if (phase !== "ready" || !unionId) return;
    const career = normalizeSlotCareerStats(getSlotCareer(getActiveSaveSlotIndex()));
    void bootstrapTapTapAchievements(String(unionId), career, collectAllUnlockedAchievementIds());
  },
  { immediate: true },
);

provide("tryUnlockAchievements", unlockAchievementsWithCtx);
provide("achievementToastQueue", achievementToastQueue);
provide("developerModeEnabled", developerModeEnabled);
provide("applyDeveloperAchievementCheat", applyDeveloperAchievementCheatFromApp);

/** @param {number} slotIndex @param {(career: import('./save/runSaveSchema.js').SlotCareerStats) => void} mutator */
function persistCollectionCareer(slotIndex, mutator) {
  const before = JSON.stringify(
    normalizeSlotCareerStats(getSlotCareer(slotIndex) ?? createEmptySlotCareerStats()),
  );
  mutateSlotCareer(slotIndex, mutator);
  const after = JSON.stringify(
    normalizeSlotCareerStats(getSlotCareer(slotIndex) ?? createEmptySlotCareerStats()),
  );
  if (before !== after) {
    bumpCollectionUi();
  }
}

/** @param {{ index: number, mode: string }} payload */
function onSaveSlotSelect(payload) {
  const { index, mode } = payload;
  if (mode === "delete") {
    clearSlot(index);
    resetSlotProfile(index);
    bumpSaveUi();
    return;
  }
  if (mode === "select") {
    setActiveSaveSlotIndex(index);
    if (!isSlotProfileActivated(index)) {
      if (isSlotOccupied(index)) {
        ensureSlotProfileActivated(index);
      } else {
        void applyProfileDefaultsFromTapTap(account.value, index);
      }
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
  sessionRunPresetId.value = normalizeRunPresetId(payload.runPresetId);
  sessionRunDifficultyIndex.value = normalizeRunDifficultyIndex(payload.runDifficultyIndex);
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
  recordRunStartedForSlot(index);
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

const showMaterialBench = ref(false);

const bootCombinedProgress = computed(() => {
  const w = BOOT_PROGRESS_WEIGHT;
  return (
    loadProgress.value * w.dictionary +
    bootImageLoadProgress.value * w.images +
    bootPosterLoadProgress.value * w.poster +
    (remixIconReady.value ? 1 : 0) * w.remixIcon
  );
});

const appBootReady = computed(
  () => dictionaryReady.value && remixIconReady.value && bootImagesReady.value,
);
const appShellUnlocked = computed(
  () => appBootReady.value && (!isPrivacyConsentRequired() || privacyConsentGranted.value),
);
const showMenu = computed(() => appShellUnlocked.value && screen.value === "menu");
const showCollection = computed(() => appShellUnlocked.value && screen.value === "collection");
const showGame = computed(() => appShellUnlocked.value && screen.value === "game");

const collectionCareer = computed(() => {
  void collectionRefreshKey.value;
  void saveUiRefreshKey.value;
  return normalizeSlotCareerStats(getSlotCareer(getActiveSaveSlotIndex()));
});

const menuCollectionProgressSuffix = computed(() => {
  void saveUiRefreshKey.value;
  void collectionRefreshKey.value;
  const career = normalizeSlotCareerStats(
    getSlotCareer(getActiveSaveSlotIndex()) ?? createEmptySlotCareerStats(),
  );
  return formatCollectionMenuProgressSuffix(career);
});
const dictGate = computed(() => !appBootReady.value);
const dictBootError = computed(() => !dictLoading.value && !!dictError.value);
const dictBootErrorMessage = computed(() => formatDictionaryLoadErrorForPlayer(dictError.value));
const bootLoadTotal = computed(() => bootAssetsTotalCount + 2);
const bootLoadLoaded = computed(() => {
  let loaded = bootAssetsLoadedCount.value;
  if (dictionaryReady.value) loaded += 1;
  if (remixIconReady.value) loaded += 1;
  return Math.min(loaded, bootLoadTotal.value);
});
const bootLoadStatusLabel = computed(
  () => `正在加载…（${bootLoadLoaded.value}/${bootLoadTotal.value}）`,
);
const dictBarPct = computed(() => {
  if (dictBootError.value) return 100;
  if (!appBootReady.value) {
    return Math.round(Math.min(bootCombinedProgress.value, 0.99) * 100);
  }
  return 100;
});

let appAlive = true;
let disposeAppE2eHarness = null;
let disposeDevConsole = null;
let disposeMaterialBenchShortcut = null;
let profileInitDone = false;

function openMaterialBench() {
  showMaterialBench.value = true;
}

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

watch(tapTapPhase, (phase) => {
  if (isE2eMode() || !Capacitor.isNativePlatform()) return;
  if (!TAP_TAP_AUTH_MENU_ONLY_PHASES.has(phase)) return;
  if (screen.value !== "game" && screen.value !== "collection") return;
  showRunStartDialog.value = false;
  runStartQuickConfirm.value = { ...runStartQuickConfirm.value, open: false };
  sessionRestoredSave.value = null;
  screen.value = "menu";
});

watch(appBootReady, (ready) => {
  if (ready) maybeOpenPrivacyConsentOnBoot();
});

onMounted(() => {
  loadGameSettings();
  loadPlayerProfile();
  loadSaveEnvelope();
  repairSlotProfilesAfterLoad();
  setCloudSaveAppliedCallback(onCloudSaveApplied);
  void initAppLifecycle();
  loadDictionary({ shouldAbort: () => !appAlive });
  loadRemixIconFont({ shouldAbort: () => !appAlive });
  loadBootImages({ shouldAbort: () => !appAlive });
  void maybeInitProfile();
  maybeOpenPrivacyConsentOnBoot();
  disposeDevConsole = registerDevConsole({
    getActiveSlotIndex: () => getActiveSaveSlotIndex(),
    mutateCareer: mutateSlotCareer,
    refreshUi: bumpCollectionUi,
    openMaterialBench,
    enableDeveloperMode,
    openTapTapEngagementPrompt: () => openTapTapEngagementLayer({ showIntroQuestion: true }),
  });

  globalThis.__WM_previewAchievementToast = () =>
    achievementToastQueue.previewRandom(ACHIEVEMENT_DEFINITIONS, Math.random);
  if (isMaterialBenchEnabled()) {
    const shortcut = { open: openMaterialBench };
    globalThis.__WM_MATERIAL_BENCH__ = shortcut;
    disposeMaterialBenchShortcut = () => {
      if (globalThis.__WM_MATERIAL_BENCH__ === shortcut) {
        delete globalThis.__WM_MATERIAL_BENCH__;
      }
    };
  }
  if (isE2eMode()) {
    disposeAppE2eHarness = registerAppTestHarness({
      screen,
      gameSessionKey,
      sessionRunSeed,
      sessionRunSeedDisplay,
      dictionaryReady,
      remixIconReady,
      bootImagesReady,
      loadDictionary: () => loadDictionary({ shouldAbort: () => !appAlive }),
      loadRemixIconFont: () => loadRemixIconFont({ shouldAbort: () => !appAlive }),
      loadBootImages: () => loadBootImages({ shouldAbort: () => !appAlive }),
    });
  }
});

onBeforeUnmount(() => {
  disposeDevConsole?.();
  disposeDevConsole = null;
  disposeMaterialBenchShortcut?.();
  disposeMaterialBenchShortcut = null;
  disposeAppE2eHarness?.();
  disposeAppE2eHarness = null;
  setCloudSaveAppliedCallback(() => {});
  void disposeAppLifecycle();
  delete globalThis.__WM_previewAchievementToast;
  appAlive = false;
});

function onDictBootBarClick() {
  if (!dictBootError.value) return;
  loadDictionary({ shouldAbort: () => !appAlive });
}

function shouldUseRunStartDialog(slotIx) {
  const career = getSlotCareer(slotIx);
  return hasSlotCompletedAnyRun(career);
}

function clearInProgressRunProgressIfAny(slotIx) {
  if (!hasContinuableRun(slotIx) && !hasAbandonedFreshRun(slotIx)) return;
  clearSlotRunProgress(slotIx);
  bumpSaveUi();
}

function pruneAbandonedFreshRunForSlot(slotIx) {
  if (pruneAbandonedFreshRun(slotIx)) bumpSaveUi();
}

function closeRunStartQuickConfirm() {
  runStartQuickConfirm.value = {
    ...runStartQuickConfirm.value,
    open: false,
  };
}

function openRunStartQuickConfirm(payload) {
  runStartQuickConfirm.value = {
    open: true,
    kind: payload.kind,
    slotIx: payload.slotIx,
    mode: payload.mode,
    title: payload.title,
    message: payload.message,
    confirmLabel: payload.confirmLabel,
    cancelLabel: payload.cancelLabel,
  };
}

function persistSlotCareerSelection(slotIx, careerForSlot) {
  try {
    const envelope = structuredClone(loadSaveEnvelope());
    if (envelope.slots[slotIx]) {
      envelope.slots[slotIx].career = careerForSlot;
      localStorage.setItem("word_master_run_saves_v1", JSON.stringify(envelope));
      loadSaveEnvelope();
      bumpSaveUi();
    }
  } catch {
    /* ignore */
  }
}

/** 确认开新局时计入生涯「开局次数」（继续存档不计） */
function recordRunStartedForSlot(slotIx) {
  mutateSlotCareer(slotIx, (career) => {
    recordCareerRunStarted(career);
  });
  bumpSaveUi();
}

function buildDefaultNewRunOptions(slotIx) {
  const careerForSlot = normalizeSlotCareerStats(
    getSlotCareer(slotIx) ?? createEmptySlotCareerStats(),
  );
  const presetId = normalizeRunPresetId(getLastSelectedPresetId(careerForSlot));
  let difficultyIndex = normalizeRunDifficultyIndex(
    getLastSelectedDifficultyBrowseIndex(careerForSlot),
  );
  if (careerForSlot.runsCompleted <= 0) {
    difficultyIndex = 0;
  }
  const { seedNumeric, seedDisplay } = resolveRunSeedFromDialog("");
  setLastSelectedPresetId(careerForSlot, presetId);
  setLastSelectedDifficultyIndex(careerForSlot, difficultyIndex);
  persistSlotCareerSelection(slotIx, careerForSlot);
  return { presetId, difficultyIndex, seedNumeric, seedDisplay };
}

async function startDirectNewRun(slotIx, mode = "menu") {
  if (transitionBusy.value) return;
  const { presetId, difficultyIndex, seedNumeric, seedDisplay } = buildDefaultNewRunOptions(slotIx);
  sessionRunPresetId.value = presetId;
  sessionRunDifficultyIndex.value = difficultyIndex;

  if (mode === "menu" && !isSlotOccupied(slotIx)) {
    const resetProfile = !isSlotProfileActivated(slotIx);
    await startNewRunAtSlot(slotIx, seedNumeric, seedDisplay, resetProfile);
    return;
  }

  recordRunStartedForSlot(slotIx);
  clearInProgressRunProgressIfAny(slotIx);

  sessionRestoredSave.value = null;
  sessionRunSeed.value = seedNumeric;
  sessionRunSeedDisplay.value = seedDisplay;
  sessionSaveSlotIndex.value = slotIx;
  setActiveSaveSlotIndex(slotIx);
  transitionBusy.value = true;
  await irisFxRef.value?.play({
    onCovered: () => {
      gameSessionKey.value += 1;
      if (mode === "menu" || mode === "restart") screen.value = "game";
    },
  });
  transitionBusy.value = false;
}

function openRunStartDialogFlow({ mode, slotIx, prefillSeed = "" }) {
  runStartPrefillSeed.value = prefillSeed;
  runStartMode.value = mode;
  pendingNewRunSlotIndex.value = slotIx;
  showRunStartDialog.value = true;
}

function openRunStartFlow({ mode, prefillSeed = "" }) {
  if (transitionBusy.value) return;
  const slotIx =
    mode === "restart" ? sessionSaveSlotIndex.value : getActiveSaveSlotIndex();

  pruneAbandonedFreshRunForSlot(slotIx);

  if (shouldUseRunStartDialog(slotIx)) {
    openRunStartDialogFlow({ mode, slotIx, prefillSeed });
    return;
  }

  if (mode === "menu" && hasContinuableRun(slotIx)) {
    openRunStartQuickConfirm({
      kind: "continue",
      slotIx,
      mode,
      title: "继续游戏",
      message: "是否继续之前的进度？",
      confirmLabel: "继续",
      cancelLabel: "开始新游戏",
    });
    return;
  }

  if (mode === "restart") {
    openRunStartQuickConfirm({
      kind: "new-run",
      slotIx,
      mode,
      title: "开始新的一局",
      message: "是否开始新的一轮？本轮进度不会保存。",
      confirmLabel: "开始",
      cancelLabel: "取消",
    });
    return;
  }

  void startDirectNewRun(slotIx, mode);
}

async function onRunStartQuickConfirm() {
  const { kind, slotIx, mode } = runStartQuickConfirm.value;
  closeRunStartQuickConfirm();
  if (kind === "continue") {
    await startLoadSlot(slotIx);
    return;
  }
  await startDirectNewRun(slotIx, mode);
}

function onRunStartQuickCancel() {
  const { kind, slotIx, mode } = runStartQuickConfirm.value;
  closeRunStartQuickConfirm();
  if (kind === "continue") {
    void startDirectNewRun(slotIx, mode);
  }
}

function onRunStartQuickDismiss() {
  closeRunStartQuickConfirm();
}

function onMenuRequestStart() {
  openRunStartFlow({ mode: "menu" });
}

function onGameRequestRestart(payload) {
  openRunStartFlow({
    mode: "restart",
    prefillSeed: payload?.prefillSeed ? sessionRunSeedDisplay.value : "",
  });
}

function clearRunStartFreshUnlocks() {
  runStartFreshUnlocks.value = { presetIds: [], difficultyIndices: [] };
}

async function onRunStartConfirm(payload) {
  if (transitionBusy.value) return;
  runStartPrefillSeed.value = "";
  showRunStartDialog.value = false;
  clearRunStartFreshUnlocks();

  const slotIx =
    pendingNewRunSlotIndex.value != null ? pendingNewRunSlotIndex.value : getActiveSaveSlotIndex();
  pendingNewRunSlotIndex.value = null;

  if (payload.mode === "continue") {
    if (!hasContinuableRun(slotIx)) return;
    runStartMode.value = "menu";
    await startLoadSlot(slotIx);
    return;
  }

  const seedNumeric = coerceRunSeedNumeric(payload.seedNumeric);
  const seedDisplay = String(payload.seedDisplay ?? "");
  const presetId = normalizeRunPresetId(payload.presetId);
  const difficultyIndex = normalizeRunDifficultyIndex(payload.difficultyIndex);

  const careerForSlot = normalizeSlotCareerStats(
    getSlotCareer(slotIx) ?? createEmptySlotCareerStats(),
  );
  setLastSelectedPresetId(careerForSlot, presetId);
  setLastSelectedDifficultyIndex(careerForSlot, difficultyIndex);
  try {
    const envelope = structuredClone(loadSaveEnvelope());
    if (envelope.slots[slotIx]) {
      envelope.slots[slotIx].career = careerForSlot;
      localStorage.setItem("word_master_run_saves_v1", JSON.stringify(envelope));
      loadSaveEnvelope();
      bumpSaveUi();
    }
  } catch {
    /* ignore */
  }

  sessionRunPresetId.value = presetId;
  sessionRunDifficultyIndex.value = difficultyIndex;

  if (runStartMode.value === "menu" && !isSlotOccupied(slotIx)) {
    const resetProfile = !isSlotProfileActivated(slotIx);
    await startNewRunAtSlot(slotIx, seedNumeric, seedDisplay, resetProfile);
    runStartMode.value = "menu";
    return;
  }

  recordRunStartedForSlot(slotIx);
  clearInProgressRunProgressIfAny(slotIx);

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

async function onGameExitToMenu() {
  if (transitionBusy.value) return;
  sessionRestoredSave.value = null;
  transitionBusy.value = true;
  const slotIx = sessionSaveSlotIndex.value;
  await irisFxRef.value?.play({
    onCovered: () => {
      screen.value = "menu";
      pruneAbandonedFreshRunForSlot(slotIx);
      bumpSaveUi();
    },
  });
  transitionBusy.value = false;
}

/** 全局 Teleport 浮层优先于局内/收藏（priority 150） */
const ANDROID_BACK_APP_SHELL_PRIORITY = 150;

/** @type {(() => void) | null} */
let unregisterAppAndroidBack = null;

onMounted(() => {
  unregisterAppAndroidBack = registerAndroidBackHandler(ANDROID_BACK_APP_SHELL_PRIORITY, () =>
    handleAppAndroidBack({
      dictGate: () => dictGate.value,
      transitionBusy,
      showTapTapPoster,
      showSaveSlots,
      showPlayerProfile,
      showSettings,
      showAbout,
      showPrivacyConsent,
      privacyConsentMode,
      runStartQuickConfirm,
      showRunStartDialog,
      showCollection: () => showCollection.value,
      showMenu: () => showMenu.value,
      showGame: () => showGame.value,
      closeSaveSlots,
      closePlayerProfile,
      closeSettings,
      closeAbout,
      closePrivacyConsentView,
      onPrivacyConsentDecline,
      dismissRunStartQuickConfirm: onRunStartQuickDismiss,
      cancelRunStartDialog: onRunStartCancel,
      closeCollection,
    }),
  );
});

onBeforeUnmount(() => {
  if (showRunStartDialog.value) resumeGamePauseGsapFreeze();
  unregisterAppAndroidBack?.();
  unregisterAppAndroidBack = null;
});

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

.dict-boot-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: calc(14 * var(--rpx));
  width: min(78%, calc(560 * var(--rpx)));
}

.dict-boot-status,
.dict-boot-error-msg {
  margin: 0;
  text-align: center;
  font-size: calc(24 * var(--rpx));
  line-height: 1.4;
}

.dict-boot-status {
  color: #5c5a52;
}

.dict-boot-error-msg {
  color: #8b4040;
}

.dict-boot-bar {
  width: 100%;
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
