<template>
  <div class="game-container">
    <Teleport defer to="#game-view-portal-frame">
      <InRunShopPhase v-if="runSessionHostsReady && showShop" ref="shopPanelRef" />
    </Teleport>

    <RunOverlayHost
      v-if="runSessionHostsReady"
      ref="runOverlayHostRef"
    />

    <InRunPlayfield
      v-if="runSessionHostsReady && !showShop"
      ref="gamePanelPlayfieldRef"
    />

    <RunEndFlowHost v-if="runSessionHostsReady" ref="runEndFlowHostRef" />

    <StageSettlementLayer
      ref="settlementLayerRef"
    />

    <FirstWordTutorialHost v-if="runSessionHostsReady" ref="firstWordTutorialLayerRef" />
  </div>
</template>

<script setup>
/**
 * 动画约定：位移/尺寸/缩放/旋转统一 EASE_TRANSFORM（expo.out），见 src/constants.js 与 .cursor/rules/animation-easing.mdc
 */
import { computed, inject, onBeforeMount, provide, ref, unref, watch, watchEffect, onMounted, onUnmounted, nextTick } from "vue";
import { useViewportLayoutMode } from "../composables/useViewportLayoutMode.js";
import { wireGamePanelControllers } from "../runSession/wireGamePanelControllers.js";
import {
  RUN_SESSION_KEY,
  isRunSessionReadyForHosts,
  mountRunSessionNamespaces,
  useRunSession,
} from "../runSession/useRunSession.js";
import { createPhaseStore } from "../runSession/createPhaseStore.js";
import InRunShopPhase from "./run/InRunShopPhase.vue";
import RunOverlayHost from "./run/RunOverlayHost.vue";
import StageSettlementLayer from "./run/StageSettlementLayer.vue";
import { useGamePanelSessionAssembly, submitAccessoryUpgradeBatchState } from "../runSession/useGamePanelSessionAssembly.js";
import { wireGamePanelFxFromDeps } from "../runSession/wireGamePanelFxFromDeps.js";
import {
  buildGamePanelAssemblyFromWiring,
} from "../runSession/buildGamePanelAssemblyDeps.js";
import { createPlayfieldDomSurface, refToDom } from "../runSession/playfieldDomUtils.js";
import { resolveRunOverlayChildLayer } from "../runSession/resolveRunOverlayChildLayer.js";
import { createPlayfieldSubmitSurface } from "../runSession/createPlayfieldSubmitSurface.js";
import { wireOverlayViewContext } from "../runSession/wireOverlayViewContext.js";
import { wireGamePanelPostAssembly } from "../runSession/wireGamePanelPostAssembly.js";
import { wireGamePanelSettlement } from "../runSession/wireGamePanelSettlement.js";
import { buildGamePanelDevCommandsOptions, createGamePanelDevHandlers } from "../runSession/createGamePanelDevHandlers.js";
import { wireGamePanelPlatform } from "../runSession/wireGamePanelPlatform.js";
import { setupGamePanelAssembly } from "../runSession/setupGamePanelAssembly.js";
import { createGamePanelBootstrapSource } from "../runSession/createGamePanelBootstrapSource.js";
import { createBossMechanicsEarlyState } from "../runSession/controllers/useBossMechanicsController.js";
import { treasureGemClassForRarity } from "../runSession/controllers/useTreasureInventoryController.js";
import {
  pfEnsureSlotRafRunning,
  pfSetSlotRafLastTime,
  pfUpdateSlotPositions,
  pfOnWordSlotsLayoutResize,
} from "../runSession/gpPlayfieldBridge.js";

function ensureSlotRafRunning() {
  pfEnsureSlotRafRunning();
}

function onWordSlotsLayoutResize() {
  pfOnWordSlotsLayoutResize();
}
import { useOverlayStackController } from "../runSession/controllers/useOverlayStackController.js";
import { useRunPanelBootstrap } from "../runSession/controllers/useRunPanelBootstrap.js";
import {
  useRunSubmitCountPresentation,
} from "../runSession/controllers/useRunSubmitCountPresentation.js";

import {
  TREASURE_DEFINITIONS,
  notifyOwnedTreasuresOnIceBreak,
} from "../treasures/treasureRegistry.js";

import { createSubmitWordResolver } from "../game/submitWordPipeline.js";
import {
  syncShopUpgradesFreeFromOwnedTreasures,
} from "../treasures/treasureAcquireInit.js";

import { applyRarityLevelUpgrade, hasRarityTierMerge } from "../game/treasureRarityTierMerge.js";

import {
  noteTreasureRunUpgradeUsed,
} from "../treasures/treasureRunTracking.js";

import {
  resolveBossSlugForMechanics,
} from "../game/treasureBossSuppress.js";
import {
  createTreasureRunState,
} from "../treasures/treasureRunState.js";

import { IMPLEMENTED_TREASURE_ID_SET } from "../treasures/treasureCatalog.js";
import { SPELL_DEFINITIONS } from "../spells/spellDefinitions.js";

import {
  RUN_START_LEVEL_INDEX,
  getRunLevelAtIndex,
  getRunLevelIndexForId,
} from "../levelDefinitions";

import {
  recordAchievementRunInterest,
} from "../achievements/achievementRunState.js";
import {
  reportBestSingleWordScoreIfImproved,
} from "../taptap/tapTapLeaderboardSync.js";

import {
  isBossTileDebuffed,
} from "../game/bossTileDebuff.js";
import { coerceRunSeedNumeric, createRunRng } from "../game/runRng.js";
import { getSlotCareer } from "../save/runSaveStorage.js";
import { normalizeSlotCareerStats } from "../save/slotCareerStats.js";
import {
  createRunMatchStats,
  recordShopPurchase,
  recordWordSubmit,
} from "../game/runMatchStats.js";

import {
  createRunDiscoveryLog,
} from "../game/runCollectionDiscoveries.js";
import { buildSubmitAfterLettersContext as buildSubmitAfterLettersContextFromDeps } from "../game/playfieldSubmitContext.js";
import { createGamePanelDevCommands } from "../dev/gamePanelDevCommands.js";
import {
  startGamePanelFromRestoredSave as startGamePanelFromRestoredSaveRunner,
  startGamePanelNewRun as startGamePanelNewRunRunner,
} from "../runSession/gamePanelBootstrapRunners.js";
import { buildGamePanelBootstrapDeps } from "../runSession/buildGamePanelBootstrapDeps.js";
import {
  SCORING_GAP_SCALE,
  SCORING_BUBBLE_POP_DELAY_MS,
  SCORING_STEP_BEAT_MS,
} from "../game/scoreBubbleFx.js";

import { isBossLevelEnterRestrictionSlug } from "../game/bossRestrictionCue.js";

import { useGameState } from "../composables/useGameState";
import { deckCardRaw, syncTileStateToDeckCard } from "../game/deckCardSync.js";

import {
  runSpellTileAppearanceAnim,
  runDetachedTileShrinkReplacePop,
  cloneSpellTileSnapshot,
} from "../game/spellTileAppearanceAnim.js";

import { pickRandomInRunSpellId, IN_RUN_RANDOM_SPELL_EXCLUDE } from "../spells/spellInRunPool.js";
import {
  buildSpellPoolExcludeIds,
  canPurchaseSpellInShop,
} from "../spells/spellPoolEligibility.js";

import { rollInRunBundlePackOfKind } from "../shop/rollInRunBundlePack.js";

import { offerFlyOriginRectFromEl } from "../game/offerFlyOrigin.js";
import {
  buildOwnedVoucherDetailTreasure,
  buildOwnedVoucherPairGroups,
} from "../vouchers/voucherOwnedDisplay.js";
import {
  getPresetStartMoneyBonus,
  getPresetStartVoucherIds,
  getPresetStartWildcardCount,
} from "../game/runPresetRuntime.js";

import { resolveWordLengthJudgmentBonus } from "../game/wordLengthJudgmentBonus.js";
import { normalizeRunPresetId } from "../game/runPresetDefinitions.js";
import { normalizeRunDifficultyIndex } from "../game/runDifficultyDefinitions.js";
import {
  getDifficultyStartMoneyBonus,
  ownedTreasureHasNoSellAccessory,
} from "../game/runDifficultyRuntime.js";

import {
  normalizeExclusiveTileAccessoryPair,
} from "../accessories/accessoryState.js";
import { buildOwnedTreasureSlot } from "../treasures/ownedTreasureSlot.js";
import {
  clampRemainingRemovalsForBossMechanics,
  getLengthTableLenFromTileCountAndBonus,
  isLengthObservatoryBoosted,
} from "../vouchers/voucherRuntime.js";

import { useDictionary } from "../composables/useDictionary";
import { formatDictionaryLoadErrorForPlayer } from "../dictionary/dictionaryBootErrorCopy.js";

import { resolveLetterFromRaw } from "../settings/letterQ.js";
import {
  getWordLengthScoreForTableLen,
  getLengthMultiplier,
  scaleLengthContributionForBoss,
  getRarityForLetter,
  getWordLetterCount,
  isWildcardMaterialTile,
} from "../composables/useScoring";

import {
  gridSelectedPositionKeySet,
} from "../game/gridOnlyMaterialScoring.js";

import LetterTile from "./LetterTile.vue";
import InRunPlayfield from "./run/InRunPlayfield.vue";
import RunEndFlowHost from "./run/RunEndFlowHost.vue";
import {
  isTreasureBarSlotVisible,
  resolveTreasureSlotsLayoutClass,
} from "../game/treasureBarLayout.js";

import { bumpOverlayZ } from "../game/overlayStack.js";
import { scheduleOverlayDismiss, scheduleOverlayPresent, triggerHaptic } from "../platform/haptics.js";
import { recordPointerClientFromEvent } from "../game/lastPointerClient.js";
import { scoringSleep } from "../game/submitScoringTiming.js";
import {
  enterGamePause,
  isGamePaused,
  pauseAwareDelay,
  releaseAllGamePause,
  resetGamePause,
} from "../game/gamePause.js";

import {
  applyIceMaterialToAllDeckCards,
  applyIceMaterialToAllGridTiles,
  isAllIceDevScenario,
} from "../dev/allIceDevScenario.js";
import {
  applyRandomBLettersToGrid,
  isMaskBubbleDevScenario,
} from "../dev/maskBubbleBlueprintScenario.js";
import { isCeruleanBellDevScenario } from "../dev/ceruleanBellDevScenario.js";
import { isPagerDevScenario } from "../dev/pagerDevScenario.js";
import { isEctoplasmDevScenario } from "../dev/ectoplasmDevScenario.js";
import {
  isNoSellGoldBombCometDevScenario,
} from "../dev/noSellGoldBombCometDevScenario.js";
import {
  isMouthQuProblemDevScenario,
  applyProblemQuRowToGrid,
} from "../dev/mouthQuProblemDevScenario.js";
import {
  applyPromoGameplayGridMaterials,
  applyPromoGameplayTileBonuses,
} from "../dev/screenshotPresetScenario.js";
import FirstWordTutorialHost from "./run/FirstWordTutorialHost.vue";

/** 提交时是否展示词典释义；暂时关闭，后续可改回 true 恢复 */
const SHOW_SUBMIT_TRANSLATION = false;

const {
  getWordDefinition,
  isValidWord,
  loadDictionary,
  resolveWordPattern,
  resolveWordPatternWithMouthSubstitutions,
  resolveWordSlotPatternWithMouthSubstitutions,
  getCandidateWordsByLength,
  dictionaryReady,
  error: dictError,
} =
  useDictionary();
const submitWordResolver = createSubmitWordResolver({
  resolveWordPattern,
  resolveWordPatternWithMouthSubstitutions,
  resolveWordSlotPatternWithMouthSubstitutions,
});
const dictFatalError = computed(() => !!dictError.value && !dictionaryReady.value);
const dictFatalMessage = computed(() => formatDictionaryLoadErrorForPlayer(dictError.value));

const overlayStackController = useOverlayStackController({
  bumpOverlayZ,
});

function reloadPage() {
  window.location.reload();
}

overlayStackController.initGlobalOverlays({
  dictFatalOpen: dictFatalError,
  dictFatalMessage,
  onDictFatalReload: reloadPage,
});

watch(
  dictFatalError,
  (v) => {
    if (v) overlayStackController.bumpDictFatalPortal();
  },
  { immediate: true },
);

function showToast(msg, ms = 2000) {
  overlayStackController.showToast(msg, ms);
}

/** @type {import('vue').Ref<string[]>} */
const props = defineProps({
  runSeed: { type: Number, default: 0 },
  runSeedDisplay: { type: String, default: "" },
  runPresetId: { type: String, default: "preset_01" },
  runDifficultyIndex: { type: Number, default: 0 },
  restoredSave: { type: Object, default: null },
  saveSlotIndex: { type: Number, default: 0 },
  firstWordTutorial: { type: Boolean, default: false },
});

const runPresetId = ref(
  normalizeRunPresetId(props.restoredSave?.runPresetId ?? props.runPresetId),
);
const runDifficultyIndex = ref(
  normalizeRunDifficultyIndex(props.restoredSave?.runDifficultyIndex ?? props.runDifficultyIndex),
);

const { portalFullscreenTarget } = useViewportLayoutMode();

const emit = defineEmits(["request-restart", "exit-to-menu"]);
const session = useRunSession(props, emit);
provide(RUN_SESSION_KEY, session);
/** inject 依赖子树须等 assembly + settlement 接线完成后再挂载 */
const runSessionHostsReady = ref(false);
/** @type {ReturnType<typeof createPhaseStore> | null} */
let phaseStore = null;

const ownedVoucherIds = ref([]);

const runRng = ref(
  createRunRng(
    coerceRunSeedNumeric(props.restoredSave?.runSeedNumeric ?? props.runSeed),
    props.restoredSave?.rngState,
  ),
);
function runRandom() {
  return runRng.value.next();
}

const devTreasurePickerItems = computed(() =>
  TREASURE_DEFINITIONS.filter((t) => IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId)).map((t) => ({
    treasureId: t.treasureId,
    name: t.name,
    emoji: t.emoji,
    rarity: t.rarity,
  })),
);

const devSpellPickerItems = computed(() =>
  SPELL_DEFINITIONS.map((s) => ({
    spellId: s.id,
    name: s.name,
    iconClass: s.iconClass,
  })),
);

let packPickController;
let packPickSession = ref(/** @type {null | object} */ (null));
let packPickBusy = ref(false);
let packPickSkipBusy = ref(false);
let packPickOverlaySuppressed = ref(false);
/** @type {(o: unknown) => string} */
let packPickOptionKeyOf = () => "";
/** @type {(s: unknown) => number} */
let packPickRequiredPicks = () => 0;
let runInRunPackPickFlow = async () => {};
let onPackPickSkip = async () => {};
let onPackInnerClaim = async () => {};
let fulfillPackInnerPurchase = async () => {};
let ensurePackPickOverlayVisible = () => {};
let shouldRestorePackPickOverlayAfterSpellConfirm = () => false;
let openShopPackSession = (_t) => {};

/** spellCastController 装配后回填（treasure hooks 早于 assembly 声明处引用） */
let spellGrantDetailCloseHandler = () => {};
let queueOrRunSpellTileAppearanceAnim = async () => {};
let runSpellPreviewChain = async () => {};
let runSpellPreviewChainAfterDetailClose = async () => {};
let runInRunSpellGrant = async () => {};
let onSpellTargetConfirm = async () => {};
let onSpellTargetCancel = async () => {};

/** @type {() => object} */
const buildTreasurePoolSnapshotBridge = { run: () => ({}) };
const resolveBuildTreasurePoolSnapshot = () => buildTreasurePoolSnapshotBridge.run();

/** 用于「重播」法术：上一张成功结算的非重播法术 id */
const lastReplayableSpellId = ref(/** @type {string | null} */ (null));
/** 本局已成功预览确认的法术 id 序列（用于 restart 向前追溯） */
const spellCastHistory = ref(/** @type {string[]} */ ([]));
/** 非 null 时显示法术目标选择层 */
const spellTargetSession = ref(null);
/**
 * 法术格外观动效：棋盘在 `v-if="!showShop"` 内，商店开着时无 LetterTile DOM，GSAP 无法缩放；
 * 暂存 `runSpellTileAppearanceAnim` 的参数对象，关店后再播放。
 * @type {import('vue').Ref<null>}
 */
const pendingSpellTileAppearanceAnim = ref(null);
/** 商店购买的「升级」道具，下一小关生效（预留） */
const ownedUpgrades = ref([]);
/** 商店升级顶栏动效播放时暂隐其它 portal 浮层（包内多选未完成时动效后再显示） */
const shopOverlayLayersSuppressed = ref(false);
/** 升级序列进度：仅最后一步允许通过事件提前解锁点击 */
/** 小关结算 / 整局结束 / 暂停选项 */
function isRunFlowOverlayOpen() {
  if (phaseStore) return phaseStore.isRunFlowOverlayOpen();
  return showSettlement.value || showRunEnd.value || showPauseOptions.value || showDeveloperOptions.value;
}

/** 与暂停选项互斥的局内流程层（不含选项层本身） */
function isBlockingPauseOpen() {
  if (phaseStore) return phaseStore.isBlockingPauseOpen();
  return showSettlement.value || showRunEnd.value;
}

/** 记分步间等待、气泡延迟等统一再 ×0.7（比上一版缩短 30%） */
const SCORING_LETTER_GAP_MS = Math.round(50 * 1.2 * SCORING_GAP_SCALE);

const { submitDeltaKey, flashSubmitCountDelta, disposeSubmitCountDeltaTimer } =
  useRunSubmitCountPresentation();



/** 至多 5 格；null 为空（须在 `useGameState` 前，供盾牌 Boss 屏蔽与宝藏逻辑） */
const ownedTreasures = ref([null, null, null, null, null, null]);
const bossTreasureRunBridge = { get: () => null };
const treasureRunState = ref(createTreasureRunState());
bossTreasureRunBridge.get = () => treasureRunState.value;
/** 非响应式 DOM 引用容器：宝藏栏槽位 imperative 查询（记分 FX / wobble 置顶） */
const gameTreasureSlotRefs = /** @type {(HTMLElement | undefined)[]} */ ([]);
/** 开发：面具+泡泡蓝图镜像手动测试（`?dev=maskBubble` 或控制台命令） */
const maskBubbleDevScenarioActive = ref(isMaskBubbleDevScenario());
/** 开发：开局全碎冰块（`?dev=allIce` 或控制台命令） */
const allIceDevScenarioActive = ref(isAllIceDevScenario());
/** 开发：第一大关 Boss 关 1-3 固定青铃（`?dev=ceruleanBell` 或控制台命令） */
const ceruleanBellDevScenarioActive = ref(isCeruleanBellDevScenario());
/** 开发：开局槽位 1 为寻呼机（`?dev=pager` 或控制台命令） */
const pagerDevScenarioActive = ref(isPagerDevScenario());
/** 开发：开局 5 宝藏各带随机非裁剪配饰（`?dev=ectoplasm`，烛台调试） */
const ectoplasmDevScenarioActive = ref(isEctoplasmDevScenario());
/** 开发：开局禁售金牌+炸弹+彗星（`?dev=noSellGoldBombComet` 或控制台命令） */
const noSellGoldBombCometDevScenarioActive = ref(isNoSellGoldBombCometDevScenario());
/** 开发：Qu+嘴+试管 problem 替换测试（`?dev=mouthQuProblem` 或控制台命令） */
const mouthQuProblemDevScenarioActive = ref(isMouthQuProblemDevScenario());
/** 开发：宣传图预设 1 的棋盘材质/加成（`setupScreenshotPreset(1)`） */
const promoScreenshotDevPresetActive = ref(0);

/** @type {{ current: import('../runSession/controllers/usePlayfieldController.js').PlayfieldController | null }} */
const playfieldActionsRef = { current: null };

/** @type {{ current: ReturnType<typeof createGamePanelDevCommands> | null }} */
const devCommandsRef = { current: null };

function syncPlayerMarkBatchCounterFromGrid() {
  playfieldActionsRef.current?.syncPlayerMarkBatchCounterFromGrid?.();
}

async function tryCeruleanBellMarkAfterGridStable() {
  await playfieldActionsRef.current?.tryCeruleanBellMarkAfterGridStable?.();
}

function registerMaskBubbleDevConsoleHook() {
  devCommandsRef.current?.registerConsoleHooks({
    startFirstWordTutorialDevTest,
  });
}

function ownedSlotTreasureIdListEarly() {
  return ownedTreasures.value.map((s) => s?.treasureId ?? null);
}

/** Boss 关：残柱牌张 uid、苍翠是否已卖藏（须在 `useGameState` 之前） */
const bossEarly = createBossMechanicsEarlyState(ownedSlotTreasureIdListEarly, () => bossTreasureRunBridge.get());
const { pillarUsedDeckUids, verdantTreasureSold } = bossEarly;
const bossMechanicsSuppressed = bossEarly.suppressed;

const bossApiBridge = {
  bossMechanicsSuppressed,
  bossSlugForMechanics: () => bossSlugBridge.fn(),
  getBossTileDebuffContext: () => bossDebuffBridge.fn(),
};
const bossSlugBridge = { fn: () => "" };
const bossDebuffBridge = {
  fn: () => ({
    pillarUsedDeckUids: pillarUsedDeckUids.value,
    verdantTreasureSold: verdantTreasureSold.value,
    ownedSlotTreasureIds: ownedSlotTreasureIdListEarly(),
    treasureRun: treasureRunState.value,
  }),
};

function bossSlugForMechanics() {
  return bossApiBridge.bossSlugForMechanics();
}

function getBossTileDebuffContext() {
  return bossApiBridge.getBossTileDebuffContext();
}

const {
  grid,
  deck,
  initialDeckSnapshot,
  deckCount,
  deckStacksView,
  remainingWords,
  remainingRemovals,
  hintRemaining,
  pendingHintChargeWord,
  currentScore,
  targetScore,
  activeBossSlug,
  selectedOrder,
  ceruleanBellSlotIndex,
  selectedTiles,
  selectTile,
  removeFromSlot,
  removeSingleTileFromWord,
  insertSelectedTileAt,
  reorderSelectedOrder,
  clearCurrentWord,
  setLastWordFromSubmit,
  applySubmitRefill,
  ensureCeruleanBellMarkedOnGrid,
  findCeruleanBellLockedTileOnGrid,
  finalizeCeruleanBellSlotIndex,
  removeSelectedLetters,
  snapshotGridCellsByTileId,
  resetLevel,
  resetDeckAfterStageEnd,
  touchGrid,
  removeDeckLetterInstancesByRaws,
  shiftDeckCardsBackByUids,
  removeDeckCardsForSubmittedWord,
  removeDeckCardByUid,
  remapTileFromRawLetter,
  markTileAsWildcard,
  refreshGridTileBaseScoresFromLevels,
  appendShopDeckEntries,
  appendDeckCardSpecToInitialSnapshot,
  appendDeckCardSpecToRunDeck,
  exportDeckState,
  hydrateDeckState,
  spellCountsByLength,
  recordSpellWordLength,
  lengthLevelsByLength,
  lengthUpgradeObservatoryExtra,
  setWordLengthLevel,
  bumpWordLengthLevel,
  rarityLevelsByRarity,
  setRarityLevel,
  basketballWordsSubmitted,
  bumpBasketballWordSubmitted,
  runWordLengthJudgmentPenalty,
  setRunWordLengthJudgmentPenalty,
  ROWS,
  COLS,
} = useGameState({
  ownedVoucherIdsRef: ownedVoucherIds,
  getRng: runRandom,
  runSeedNumeric: coerceRunSeedNumeric(props.restoredSave?.runSeedNumeric ?? props.runSeed),
  pillarUsedDeckUidsRef: pillarUsedDeckUids,
  verdantTreasureSoldRef: verdantTreasureSold,
  bossMechanicsSuppressedRef: bossMechanicsSuppressed,
  getOwnedSlotTreasureIds: ownedSlotTreasureIdListEarly,
  getTreasureRunState: () => treasureRunState.value,
  onBossTapeTriggerCue: () => bossTapeTriggerCueDispatch(),
  onBossRestrictionTreasureCue: () => bossRestrictionTreasureCueDispatch(),
});

bossSlugBridge.fn = () =>
  resolveBossSlugForMechanics(
    activeBossSlug.value,
    ownedSlotTreasureIdListEarly(),
    treasureRunState.value,
  );

/**
 * 供宝藏「结算后改棋盘」：随机非万能有字格变为万能块；
 * 动效与法术弹层确认后写回棋盘一致（`runSpellTileAppearanceAnim`，spellId 同「点亮」）。
 */
async function mutateRandomNonWildcardLetterTileToWildcard() {
  const g = grid.value;
  const selectedGridKeys = gridSelectedPositionKeySet(selectedTiles.value);
  /** @type {{ row: number, col: number }[]} */
  const candidates = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (selectedGridKeys.has(`${r},${c}`)) continue;
      const tile = g[r]?.[c];
      if (!tile?.letter) continue;
      if (isWildcardMaterialTile(tile)) continue;
      candidates.push({ row: r, col: c });
    }
  }
  if (!candidates.length) return;
  const { row, col } = candidates[Math.floor(runRandom() * candidates.length)];
  const oldSnap = cloneSpellTileSnapshot(g[row][col]);
  const draft = cloneSpellTileSnapshot(g[row][col]);
  if (!oldSnap || !draft || typeof oldSnap !== "object" || typeof draft !== "object") return;
  markTileAsWildcard(draft);
  draft.letter = "?";
  draft.isWildcard = true;
  draft.materialId = "wildcard";
  await queueOrRunSpellTileAppearanceAnim({
    spellId: "lightbulb",
    targets: [{ row, col }],
    oldSnaps: [oldSnap],
    newSnaps: [draft],
    grid,
    touchGrid,
    getTileEl: (r, c) => getGridTileElByIndex(r * COLS + c),
    nextTick,
  });
  const liveTile = grid.value[row]?.[col];
  if (liveTile?.letter) syncTileStateToDeckCard(liveTile);
  noteCollectionMaterialAcquired("wildcard");
}

const levelIndex = ref(RUN_START_LEVEL_INDEX);
/** 通关 8-3 后进入 Ante 9+ 无尽流程 */
const isEndlessRun = ref(false);

function getRunSeedNumeric() {
  return coerceRunSeedNumeric(props.runSeed);
}

/** @type {{ ctrl: ReturnType<typeof useFirstWordTutorialController> | null }} */
const firstWordTutorialCtrlSlot = { ctrl: null };
const firstWordTutorialActive = ref(false);
const scoringTreasureBarIndex = ref(/** @type {number | null} */ (null));

function isFirstWordTutorialBlockingInput() {
  return firstWordTutorialCtrlSlot.ctrl?.isBlockingInput() ?? false;
}

/** @type {() => (string | null)[]} */
let ownedSlotTreasureIdListImpl = () => [];
function ownedSlotTreasureIdList() {
  return ownedSlotTreasureIdListImpl();
}

/** @type {() => { id?: string } | null | undefined} */
let resolveNextLevelDefAfterShop = () => null;

async function beginFirstWordTutorialAfterGridSettled(opts = {}) {
  await firstWordTutorialCtrlSlot.ctrl?.beginAfterGridSettled(opts);
}

/** @type {{ word: string, length: number, tiles: object[], detailedRef?: object } | null }} */
const deferredWordSubmitPayloadBox = { value: null };
const crimsonTreasureDisabledSlotIndex = ref(/** @type {number | null} */ (null));
/** 供 `useGameState` 游蛇补牌等回调（`useBossMechanicsController` 创建后赋值） */
let bossTapeTriggerCueDispatch = () => {};
/** 供 `useGameState` 游蛇补牌等：匕首 Boss 限制触发 */
let bossRestrictionTreasureCueDispatch = () => {};

/** Boss 域 API 桥：controller 实例化前占位，创建后由 `wireBossMechanicsBridge` 接线 */
const bossMechanicsBridge = {
  playBossTapeTriggerCue: () => {},
  refreshBossTileDebuffOnTile: (_tile) => {},
  applyHookBossAfterSubmit: async () => {},
  pickCrimsonDisabledTreasureSlotIndex: () => null,
  evaluateOxBossHit: () => false,
  isCrimsonTreasureSlotDisabled: (_i) => false,
  isAmberBossMaskActive: () => false,
  isCrimsonBossMechanicsActive: () => false,
  isManacleBossGrid: () => false,
  buildBossWildcardResolveContext: () => null,
  onVerdantTreasureSold: () => false,
  onBossKeySold: async () => {},
};

const playBossTapeTriggerCue = () => bossMechanicsBridge.playBossTapeTriggerCue();
const refreshBossTileDebuffOnTile = (tile) => bossMechanicsBridge.refreshBossTileDebuffOnTile(tile);
const applyHookBossAfterSubmit = async () => bossMechanicsBridge.applyHookBossAfterSubmit();
const pickCrimsonDisabledTreasureSlotIndex = () =>
  bossMechanicsBridge.pickCrimsonDisabledTreasureSlotIndex();
const evaluateOxBossHit = (judgedLen, counts) =>
  bossMechanicsBridge.evaluateOxBossHit(judgedLen, counts);
const isAmberBossMaskActive = computed(() => bossMechanicsBridge.isAmberBossMaskActive());
const isCrimsonBossMechanicsActive = computed(() => bossMechanicsBridge.isCrimsonBossMechanicsActive());
const isManacleBossGrid = computed(() => bossMechanicsBridge.isManacleBossGrid());

/** assembly 前飞字回退 ref；bind 后以 playfieldController 为准 */
const flyingLetters = ref([]);
const flyingBackBatches = ref([]);
const wordSelectionSwapBusy = ref(false);

const playfieldSubmit = createPlayfieldSubmitSurface({
  grid,
  selectedOrder,
  selectedTiles,
  COLS,
  ROWS,
  flyingLetters,
  flyingBackBatches,
  ownedSlotTreasureIdList,
  rarityLevelsByRarity,
  submitWordResolver,
  bossMechanicsBridge,
});

const {
  buildEffectiveWordPartsForSubmit,
  buildBossWildcardResolveContext,
  resolveWordFromEffectiveParts,
  listEffectiveTilesForSubmit,
  resolveRealSubmitTileForWordSlot,
  getPlayfieldFlySnapshot,
  playfieldFlyingLettersCount,
  playfieldFlyingBackBatchesCount,
  effectiveWordPartsForSubmit,
  effectiveWordForSubmit,
  resolvedWordForSubmit,
} = playfieldSubmit;

const money = ref(0);
/** 小关结算后继续：先进商店，再点「下一关」进下一小关 */
const showShop = ref(false);

const runMatchStats = ref(createRunMatchStats());
const runDiscoveryLog = ref(createRunDiscoveryLog());

const showDeckLayer = ref(false);

const shopPanelRef = ref(null);
const runOverlayHostRef = ref(null);
const settlementLayerRef = ref(null);
const runEndFlowHostRef = ref(null);

const transitionBusy = ref(false);

const shopPrerequisiteBridge = {
  record: (treasureId, opts) => shopPrerequisiteBridge._fn?.(treasureId, opts),
};

const shopSelectionBridge = {
  presentTreasureDetail: (detail) => shopSelectionBridge._present?.(detail),
  buildShopOwnedPreviewNavItems: () => shopSelectionBridge._buildNav?.() ?? [],
  isShopTutorialBlockedShopInteraction: (offer) => shopSelectionBridge._blocked?.(offer) ?? false,
  maybeEndShopTutorialOnOfferOpen: (treasure) => shopSelectionBridge._maybeEnd?.(treasure),
  getFirstWordTutorialPhase: () => shopSelectionBridge._phase?.() ?? "",
  getTreasureDetail: () => shopSelectionBridge._getDetail?.() ?? null,
  clearTreasureDetail: () => shopSelectionBridge._clearDetail?.(),
  getTreasureDetailLayer: () => shopSelectionBridge._getLayer?.() ?? null,
};

const shopSpellRuntimeBridge = {
  getBuildSpellRuntimeContext: () => shopSpellRuntimeBridge._ctx?.() ?? {},
};

/** @type {{ current: object | null }} */
const ownedBarFxRef = { current: null };

function ownedTreasureHookFxBridge() {
  return ownedBarFxRef.current?.ownedTreasureHookFxBridge() ?? {};
}

/** @param {string} treasureId @param {number} amount @param {object} [opts] */
async function playOwnedTreasureMoneyFx(treasureId, amount, opts = {}) {
  await ownedBarFxRef.current?.playOwnedTreasureMoneyFx(treasureId, amount, opts);
}

/** @param {string} treasureId @param {number} delta */
async function playOwnedTreasureMultDeltaFx(treasureId, delta) {
  await ownedBarFxRef.current?.playOwnedTreasureMultDeltaFx(treasureId, delta);
}

async function playOwnedTreasureWobbleOnlyFx(treasureId) {
  await ownedBarFxRef.current?.playOwnedTreasureWobbleOnlyFx(treasureId);
}

/** @param {number} slotIndex @param {number} amount */
async function playTreasureSlotScoreBurstAtPeak(slotIndex, amount) {
  await ownedBarFxRef.current?.playTreasureSlotScoreBurstAtPeak(slotIndex, amount);
}

/** @param {number} slotIndex @param {string} text @param {string} [kind] */
async function playTreasureSlotBubbleBurstAtPeak(slotIndex, text, kind = "score") {
  await ownedBarFxRef.current?.playTreasureSlotBubbleBurstAtPeak(slotIndex, text, kind);
}

/** @type {{ current: ReturnType<typeof createSubmitTileLeaveAnim> | null }} */
const submitTileLeaveFxRef = { current: null };

async function runSubmittedIceShatterEffects(tiles) {
  return submitTileLeaveFxRef.current?.runSubmittedIceShatterEffects(tiles) ?? 0;
}

async function playSubmitWordLetterRemoveAndRewardLeave(opts) {
  await submitTileLeaveFxRef.current?.playSubmitWordLetterRemoveAndRewardLeave(opts);
}

async function playSubmitTileEnhancementStripLeave(opts) {
  await submitTileLeaveFxRef.current?.playSubmitTileEnhancementStripLeave(opts);
}

/** @type {{ current: ReturnType<typeof createInRunUpgradePlayback> | null }} */
const inRunUpgradePlaybackRef = { current: null };

async function runInRunUpgradePlaybackSteps(steps) {
  await inRunUpgradePlaybackRef.current?.runInRunUpgradePlaybackSteps(steps);
}

async function runInRunUpgradeStaircasePlayback(steps) {
  await inRunUpgradePlaybackRef.current?.runInRunUpgradeStaircasePlayback(steps);
}

/** @type {{ current: ReturnType<typeof createTreasureDestroyFx> | null }} */
const treasureDestroyFxRef = { current: null };

/** @type {{ current: ReturnType<typeof import('../game/wireVolcanoEruptionFx.js').createVolcanoEruptionRunner> | null }} */
const treasureLevelCompleteFxRef = { current: null };

async function destroyOwnedTreasureWithFx(treasureId, slotIndex = null) {
  await treasureDestroyFxRef.current?.destroyOwnedTreasureWithFx(treasureId, slotIndex);
}

async function destroyBombBlastAtSlot(bombSlotIndex) {
  await treasureDestroyFxRef.current?.destroyBombBlastAtSlot(bombSlotIndex);
}

async function playVolcanoEruptionAtSlot(volcanoSlotIndex) {
  await treasureLevelCompleteFxRef.current?.playVolcanoEruptionAtSlot(volcanoSlotIndex);
}

async function destroyOtherOwnedTreasureFromSourceFx(
  sourceTreasureId,
  victimTreasureId,
  victimSlotIndex = null,
) {
  await treasureDestroyFxRef.current?.destroyOtherOwnedTreasureFromSourceFx(
    sourceTreasureId,
    victimTreasureId,
    victimSlotIndex,
  );
}

/** @type {{ current: ReturnType<typeof createTreasureHourglassStageFx> | null }} */
const hourglassStageFxRef = { current: null };

async function runHourglassStageEndFx(opts) {
  await hourglassStageFxRef.current?.runHourglassStageEndFx?.(opts);
}

async function runLevelEndPreSettlementFx() {
  await ctrlEarly.runLevelEndPreSettlementFx({ runHourglassStageEndFx });
}

const showTreasureCollectionLayer = ref(false);
const showEmptyTreasureSlotHelp = ref(false);
const gameTreasureBarRowRef = ref(null);
const gameTreasureSlotsCtnRef = ref(null);

/** @type {import('vue').Ref<null | { kind: 'offer', treasure: object, originRect?: object | null } | { kind: 'owned', slotIndex: number, treasure: object, originRect?: object | null }>} */
const treasureDetail = ref(null);

const gameOwnedDragMovedBridge = { ref: /** @type {import('vue').Ref<boolean> | null} */ (null) };

/** 与 App.vue 共用的 Iris 转场组件（注入由上层提供） */
const irisTransition = inject("irisTransition", null);
/** 开局弹层（菜单 / 暂停「开始新的一局」） */
const requestNewRun = inject("requestNewRun", null);
const openSettings = inject("openSettings", null);
const mergeCareerOnRunEnd = inject("mergeCareerOnRunEnd", null);
const tryUnlockAchievements = inject("tryUnlockAchievements", null);
const recordPrerequisiteTreasureShopAppeared = inject("recordPrerequisiteTreasureShopAppeared", null);
shopPrerequisiteBridge._fn = recordPrerequisiteTreasureShopAppeared;
const patchActiveSlotCareer = inject("patchActiveSlotCareer", null);

/** @type {ReturnType<typeof import('../runSession/controllers/useTileDetailController.js').useTileDetailController> | undefined} */
let tileDetailCtrl;

/** @type {(args: object) => void} */
let presentTreasureDetail = () => {};

/** @param {number} count @param {number} staggerSec */
function scheduleStaggeredTileRemoveHaptics(count, staggerSec) {
  if (count <= 0) return;
  const staggerMs = Math.max(0, Math.round(staggerSec * 1000));
  for (let i = 0; i < count; i += 1) {
    window.setTimeout(() => triggerHaptic("tileRemove"), i * staggerMs);
  }
}
/** 升级序列进度：仅最后一步允许通过事件提前解锁点击 */
const spellReferencePreview = ref(/** @type {object | null} */ (null));
const deckBtnRef = ref(null);
const hintBtnRef = ref(null);

function treasureOriginRectFromEl(el) {
  return offerFlyOriginRectFromEl(el);
}

/** @param {{ pairId: string, originEl?: HTMLElement | null }} payload */
function onInfoSelectOwnedVoucher(payload) {
  const pairId = String(payload?.pairId ?? "").trim();
  if (!pairId) return;
  const group = buildOwnedVoucherPairGroups(ownedVoucherIds.value).find((g) => g.pairId === pairId);
  if (!group) return;
  const treasure = buildOwnedVoucherDetailTreasure(group);
  if (!treasure) return;
  presentTreasureDetail({
    kind: "voucher-owned",
    treasure,
    originRect: treasureOriginRectFromEl(payload.originEl),
  });
}

/**
 * 宝藏触发开包前：槽位 wobble + 头上组合包图标气泡（节奏对齐记分气泡）。
 * @param {number} slotIndex
 * @param {string} [bundleKind]
 */
async function runTreasurePackOpenPrecursor(slotIndex, bundleKind = "") {
  if (typeof slotIndex !== "number" || slotIndex < 0) return;
  const el = treasureInventoryCtrl.getSlotElement(slotIndex);
  if (!el) return;
  const sp = 1;
  shopOverlayLayersSuppressed.value = true;
  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  const wobbleTl = createWobbleScoreSlotTimeline(el);
  if (wobbleTl) {
    wobbleTl.timeScale(sp);
    wobbleTl.play(0);
  }
  await scoringSleep(SCORING_BUBBLE_POP_DELAY_MS, sp);
  const bubble = ctrlEarly.showBundlePackBubble(el, bundleKind, sp);
  scheduleSmallPlusBubbleOutro(bubble, sp);
  await awaitWobbleScoreSlotTimeline(wobbleTl);
  await scoringSleep(SCORING_STEP_BEAT_MS, sp);
  shopOverlayLayersSuppressed.value = false;
}

function getInRunDeckFlyTargetEl() {
  return deckBtnRef.value ?? null;
}

/** 整局结束层（失败 / 通关 8-3） */
/** @type {ReturnType<typeof useRunEndFlowController> | null} */
let runEndCtrlSlot = null;
/** @type {() => void | Promise<void>} */
let runEndEnterEndlessSlot = async () => {};

/** 稳定转发，供 assembly 注册；重绑 slot 后仍生效 */
function invokeRunEndEnterEndless() {
  return runEndEnterEndlessSlot();
}

async function openRunEnd(outcome, opts = {}) {
  return runEndCtrlSlot.openRunEnd(outcome, opts);
}

function abandonStandardWinRunProgressIfNeeded() {
  runEndCtrlSlot?.abandonStandardWinRunProgressIfNeeded();
}

function addRemainingRemovalsClamped(n) {
  const next = remainingRemovals.value + Math.floor(Number(n) || 0);
  remainingRemovals.value = clampRemainingRemovalsForBossMechanics(
    next,
    bossSlugForMechanics(),
  );
}

/** @param {number} uid @param {{ clearGrid?: boolean }} [options] */
function removeDeckCardByUidAndNotify(uid, options = {}) {
  const removed = removeDeckCardByUid(uid, options);
  if (removed) flushDeckMultisetAchievements();
  return removed;
}

/** @param {unknown[]} tiles @param {string | null | undefined} resolvedWord */
function removeDeckCardsForSubmittedWordAndNotify(tiles, resolvedWord) {
  removeDeckCardsForSubmittedWord(tiles, resolvedWord);
  flushDeckMultisetAchievements();
}

/** @param {number} [maxCount] @returns {Promise<number>} */
async function grantRandomOwnedTreasuresInRun(maxCount = 1) {
  return treasureInventoryCtrl.grantRandomOwnedInRun(maxCount);
}

/** @param {number} [maxCount] @param {{ expandWithCropWhenFull?: boolean }} [opts] @returns {Promise<number>} */
async function grantRandomOwnedTreasuresInRunWithPopAnim(maxCount = 1, opts = {}) {
  return treasureInventoryCtrl.grantRandomOwnedInRunWithPopAnim(maxCount, opts);
}

function setRarityLevelWithTreasurePairs(rarity, level) {
  applyRarityLevelUpgrade(rarity, level, setRarityLevel, ownedSlotTreasureIdList());
}

function getWordSlotRefsFromPlayfield() {
  return playfieldActionsRef.current?.wordSlotRefs ?? [];
}

function buildSubmitAfterLettersContext(tiles, detailed) {
  return buildSubmitAfterLettersContextFromDeps(
    {
      ownedSlotTreasureIdList,
      resolveRealSubmitTileForWordSlot,
      touchGrid,
      patchGridPlaceholderFreezeFromTile: (tile) =>
        playfieldActionsRef.current?.patchGridPlaceholderFreezeFromTile?.(tile),
      playSubmitTileEnhancementStripLeave,
      getWordSlotRefs: getWordSlotRefsFromPlayfield,
      getSelectedGridTileElsInOrder,
      getPendingPagerQuizSession: () => ctrlEarly.pendingPagerQuizSession.value,
      findOwnedTreasureSlotIndex,
      runPagerQuizRequest: ctrlEarly.runPagerQuizRequest,
    },
    tiles,
    detailed,
  );
}

function flushDeferredWordSubmitRecord() {
  if (!deferredWordSubmitPayloadBox.value) return;
  const { word, length, tiles, detailedRef } = deferredWordSubmitPayloadBox.value;
  const score = Math.round(Number(detailedRef?.finalScore) || 0);
  recordWordSubmit(runMatchStats.value, { word, score, length });
  maybeReportTapTapBestSingleWordScore(score);
  noteCollectionWordSubmitted({ word, score, length, tiles });
  deferredWordSubmitPayloadBox.value = null;
}

/** @param {number} len */
function buildInRunLengthUpgradeStep(len) {
  const L = Math.max(3, Math.min(16, Math.round(Number(len) || 0)));
  const beforeLevel = Math.max(1, Math.round(Number(lengthLevelsByLength.value?.[L])) || 1);
  const obs = isLengthObservatoryBoosted(ownedVoucherIds.value, L, spellCountsByLength.value);
  return {
    payload: {
      upgradeKind: "length",
      lengthMin: L,
      lengthMax: L,
      beforeLevel,
      isLengthObservatoryBoosted: () => obs,
    },
    apply: () => {
      noteTreasureRunUpgradeUsed(treasureRunState.value);
      noteCollectionUpgradeForWordLen(L);
      bumpWordLengthLevel(L, { observatoryBoost: obs });
    },
  };
}

function noteRunShopPurchase() {
  recordShopPurchase(runMatchStats.value);
  triggerHaptic("confirm");
}

const ctrlEarly = wireGamePanelControllers({
  phase: "early",
  tryUnlockAchievements,
  isRunFlowOverlayOpen,
  firstWordTutorialActive,
  getResolveNextLevelDefAfterShop: () => resolveNextLevelDefAfterShop,
  assignResolveNextLevelDefAfterShop: (fn) => {
    resolveNextLevelDefAfterShop = fn;
  },
  assignBossRestrictionTreasureCueDispatch: (fn) => {
    bossRestrictionTreasureCueDispatch = fn;
  },
  levelIndex,
  runDifficultyIndex,
  showShop,
  targetScore,
  currentScore,
  money,
  ownedVoucherIds,
  lengthLevelsByLength,
  rarityLevelsByRarity,
  spellCountsByLength,
  runMatchStats,
  runDiscoveryLog,
  ownedTreasures,
  initialDeckSnapshot,
  remainingRemovals,
  hintRemaining,
  treasureRunState,
  triggerHaptic,
  gameTreasureSlotRefs,
  settlementLayerRef,
  transitionBusy,
  runPresetId,
  getRunSeedNumeric,
  isEndlessRun,
  runRandom,
  grid,
  deck,
  activeBossSlug,
  resetLevel,
  ROWS,
  COLS,
  pillarUsedDeckUids,
  verdantTreasureSold,
  bossApiBridge,
  bossMechanicsBridge,
  maskBubbleDevScenarioActive,
  allIceDevScenarioActive,
  mouthQuProblemDevScenarioActive,
  promoScreenshotDevPresetActive,
  applyRandomBLettersToGrid,
  applyProblemQuRowToGrid,
  applyIceMaterialToAllGridTiles,
  applyIceMaterialToAllDeckCards,
  applyPromoGameplayGridMaterials,
  applyPromoGameplayTileBonuses,
  runOverlayHostRef,
  irisTransition,
  isFirstWordTutorialBlockingInput,
  scheduleRunAutoSave,
  showToast,
  recordPointerClientFromEvent,
  shopOverlayLayersSuppressed,
  shopPanelRef,
  shopPrerequisiteBridge,
  shopSelectionBridge,
  shopSpellRuntimeBridge,
  resolveBuildTreasurePoolSnapshot,
  ownedSlotTreasureIdList,
  bumpWordLengthLevel,
  setRarityLevelWithTreasurePairs,
  refreshGridTileBaseScoresFromLevels,
  noteTreasureRunUpgradeUsed,
  ownedTreasureHookFxBridge,
  playOwnedTreasureMultDeltaFx,
  readNormalizedSlotCareer,
  ownedUpgrades,
  lastReplayableSpellId,
  spellCastHistory,
  gameTreasureBarRowRef,
  showEmptyTreasureSlotHelp,
  scoringTreasureBarIndex,
  gameOwnedDragMovedBridge,
  treasureDetail,
  buildTreasurePoolSnapshotBridge,
  gameTreasureSlotsCtnRef,
  basketballWordsSubmitted,
  deckCount,
  bumpBasketballWordSubmitted,
  appendShopDeckEntries,
  appendDeckCardSpecToInitialSnapshot,
  appendDeckCardSpecToRunDeck,
  removeDeckLetterInstancesByRaws,
  canPurchaseSpellInShop,
  noteRunShopPurchase,
  nextTick,
  treasureRunHookExtras: {
    getCandidateWordsByLength,
    ownedTreasureHookFxBridge,
    resetLevel,
    syncPlayerMarkBatchCounterFromGrid,
    resolveBossSlugForMechanics: (slug, ownedIds) =>
      resolveBossSlugForMechanics(slug, ownedIds, treasureRunState.value),
    bossMechanicsSuppressed,
    isBossLevelEnterRestrictionSlug,
    getBossSlugForMechanics: bossSlugForMechanics,
    addRemainingRemovalsClamped,
    getRunDiscoveryLog: () => runDiscoveryLog.value,
    clearTileDetailLayer: () => {
      tileDetailCtrl.tileDetailPayload.value = null;
      tileDetailCtrl.tileDetailPreviewNav.value = null;
    },
    presentTreasureDetail: (args) => presentTreasureDetail(args),
    openTileDetail: (...args) => tileDetailCtrl.openTileDetail(...args),
    destroyOwnedTreasureWithFx,
    destroyBombBlastAtSlot,
    playVolcanoEruptionAtSlot,
    destroyOtherOwnedTreasureFromSourceFx,
    grantRandomOwnedTreasuresInRun,
    grantRandomOwnedTreasuresInRunWithPopAnim,
    runSpellPreviewChain: (...args) => runSpellPreviewChain(...args),
    getRemainingWords: () => remainingWords.value,
    setRemainingWords: (v) => {
      remainingWords.value = v;
    },
    getOwnedTreasureSlot: (i) => ownedTreasures.value[i],
    getRemainingRemovals: () => remainingRemovals.value,
    addMoney: (n) => {
      money.value += Math.max(0, Math.floor(Number(n) || 0));
    },
    setOwnedTreasureSlot: (ix, slot) => {
      ownedTreasures.value[ix] = slot;
    },
    runInRunSpellGrant: (...args) => runInRunSpellGrant(...args),
    runInRunPackPickFlow: (...args) => runInRunPackPickFlow(...args),
    rollInRunBundlePackOfKind,
    getWordDefinition,
    isValidWord,
    setShopOverlayLayersSuppressed: (v) => {
      shopOverlayLayersSuppressed.value = v;
    },
    nextTick,
    runInRunUpgradePlaybackSteps,
    resolveRealSubmitTileForWordSlot,
    touchGrid,
    mutateRandomNonWildcardLetterTileToWildcard,
    getTargetScore: () => targetScore.value,
    getCurrentScore: () => currentScore.value,
    getInitialDeckSnapshot: () => initialDeckSnapshot.value,
    getOwnedTreasures: () => ownedTreasures.value.filter(Boolean),
    getGrid: () => grid.value,
    getSelectedOrder: () => selectedOrder.value,
    appendDeckCardSpecToRunDeck: (spec) => appendDeckCardSpecToRunDeck(spec),
    getGridTileElAtRowCol: (row, col) => getGridTileElByIndex(row * COLS + col),
    getWordSlotElAtIndex: (index) => getWordSlotRefsFromPlayfield()[index] ?? null,
    getTreasureRunState: () => treasureRunState.value,
    getOwnedVoucherIds: () => ownedVoucherIds.value,
    getSpellCountsByLength: () => spellCountsByLength.value,
    bumpWordLengthLevel,
    buildInRunLengthUpgradeStep,
    submitAccessoryUpgradeBatchState,
    playOwnedTreasureMoneyFx,
    playOwnedTreasureWobbleOnlyFx,
    playSubmitWordLetterRemoveAndRewardLeave,
    playSubmitTileEnhancementStripLeave,
    removeDeckCardsForSubmittedWordAndNotify,
  },
});

const {
  showInfoLayer,
  currentLevel,
  levelTitleBoxRef,
  walletHeaderShown,
  achievementRunState,
  flushAchievementUnlocks,
  flushDeckMultisetAchievements,
  noteCollectionMaterialAcquired,
  noteCollectionUpgradeForWordLen,
  noteCollectionWordSubmitted,
  showScoreBubble,
  wobbleScoreSlot,
  createWobbleScoreSlotTimeline,
  awaitWobbleScoreSlotTimeline,
  scheduleSmallPlusBubbleOutro,
  formatMoneyBubbleLabel,
  scoreBubbleAnchorRect,
  wobbleGameTreasureSlot,
  shopPortalZ,
  showRunEnd,
  runEndOutcome,
  showSettlement,
  bossRerollSession,
  syncEndlessLeaderboardChapterBaseline,
  runGridIntroAfterReset,
  shopPhase,
  treasureInventoryCtrl,
  findOwnedTreasureSlotIndex,
  resetLevelAfterTreasurePrep,
} = ctrlEarly;

presentTreasureDetail = ctrlEarly.presentTreasureDetail;
ownedSlotTreasureIdListImpl = ctrlEarly.ownedSlotTreasureIdListFromController;

function judgedLengthTableLenForRun(wordLetterCount) {
  const bonus = resolveWordLengthJudgmentBonus({
    ownedVoucherIds: ownedVoucherIds.value,
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
    presetId: runPresetId.value,
    runWordLengthJudgmentPenalty: runWordLengthJudgmentPenalty.value,
    treasureRun: treasureRunState.value,
  });
  return getLengthTableLenFromTileCountAndBonus(wordLetterCount, bonus);
}

function readNormalizedSlotCareer() {
  return normalizeSlotCareerStats(getSlotCareer(props.saveSlotIndex));
}

function applyRunPresetStartEffects() {
  const pid = runPresetId.value;
  for (const vid of getPresetStartVoucherIds(pid)) {
    if (!ownedVoucherIds.value.includes(vid)) {
      ownedVoucherIds.value = [...ownedVoucherIds.value, vid];
      ctrlEarly.noteCollectionVoucherAcquired(vid);
    }
  }
  const moneyBonus = getPresetStartMoneyBonus(pid);
  if (moneyBonus > 0) money.value += moneyBonus;
  const difficultyMoneyBonus = getDifficultyStartMoneyBonus(runDifficultyIndex.value);
  if (difficultyMoneyBonus > 0) money.value += difficultyMoneyBonus;
  const wc = getPresetStartWildcardCount(pid);
  for (let i = 0; i < wc; i += 1) {
    const card = ctrlEarly.appendDeckCardSpecToInitialSnapshotAndNotify({ raw: "e", materialId: "wildcard" });
    if (card) card.isWildcard = true;
  }
  ctrlEarly.syncOwnedTreasureSlots();
}

function spellPoolExcludeIdsWhenBonusVoucherActive() {
  return shopPhase.spellPoolExcludeIdsWhenBonusVoucherActive();
}

function buildSpellPoolEligibilityCountsForRun() {
  return shopPhase.buildSpellPoolEligibilityCountsForRun();
}

function pickRandomInRunSpellIdForRun() {
  return pickRandomInRunSpellId(runRandom, [
    ...IN_RUN_RANDOM_SPELL_EXCLUDE,
    ...spellPoolExcludeIdsWhenBonusVoucherActive(),
    ...buildSpellPoolExcludeIds(buildSpellPoolEligibilityCountsForRun()),
  ]);
}

const shopInteractionsDisabled = computed(() => {
  if (shopPhase.shopUpgradeAnimating.value || packPickBusy.value) return true;
  // 包层/盲选/测验被 suppress 隐藏时，勿仅因 session 残留而锁死整页商店
  if (packPickSession.value && !packPickOverlaySuppressed.value) return true;
  if (bossRerollSession.value && !shopOverlayLayersSuppressed.value) return true;
  if (ctrlEarly.pagerQuizSession.value && !shopOverlayLayersSuppressed.value) return true;
  return false;
});

watch(showShop, async (open, prev) => {
  if (!open) {
    if (prev) scheduleOverlayDismiss(240);
    shopOverlayLayersSuppressed.value = false;
    packPickOverlaySuppressed.value = false;
    const sess = packPickSession.value;
    if (sess) {
      const claimed = sess.claimedKeys ?? [];
      if (claimed.length >= packPickRequiredPicks(sess)) {
        packPickSession.value = null;
      }
    }
    return;
  }
  scheduleOverlayPresent(280);
  shopPortalZ.value = bumpOverlayZ();
  void tileDetailCtrl.dismissTileDetailLayer();
  showInfoLayer.value = false;
  deckPreview.closeDeckLayer();
  treasureDetail.value = null;
  if (shopPhase.suppressShopEnterVisitInit.value) {
    shopPhase.onShopVisitEnter({ hydrateSkip: true });
    return;
  }
  packPickSession.value = null;
  shopPhase.onShopVisitEnter();
  if (firstWordTutorialCtrlSlot.ctrl?.phase?.value === "awaitShop") {
    await firstWordTutorialCtrlSlot.ctrl.onShopOpenedAfterEnter();
  }
});

watch(showShop, async (open) => {
  if (open) return;
  const pending = pendingSpellTileAppearanceAnim.value;
  if (pending == null) return;
  pendingSpellTileAppearanceAnim.value = null;
  await nextTick();
  await runSpellTileAppearanceAnim(pending);
});

const scoringAnimating = ref(false);
/** 提交计分前（算分等）占用，避免连点；与 scoringAnimating 错开以免 result-area 先显示 0×0 */
const submitWordBusy = ref(false);
/** 棋盘下落/补牌动画进行中，禁止点格与提交/移除 */
const gridRefillAnimating = ref(false);
/** 法术临时券抽取时排除当前货架正在出售的券 */
const gridIntroDone = ref(false);
const scoringLetterIndex = ref(-1);
/** 提交动画期间：释义按行展示（\n 拆行） */
const submitTranslationLines = ref([]);
const wordTranslationWrapRef = ref(null);
const wordTranslationInnerRef = ref(null);

const letterGridRef = ref(null);
const letterGridWrapRef = ref(null);
const gridTileRefs = ref([]);
const wordSlotRefs = /** @type {(HTMLElement | undefined)[]} */ ([]);

const playfieldDom = createPlayfieldDomSurface({
  gridTileRefs,
  letterGridRef,
  selectedOrder,
  COLS,
});

const {
  setGridTileRef,
  getGridTileElByIndex,
  getSelectedGridCellElsInOrder,
  getSelectedGridTileElsInOrder,
} = playfieldDom;

/** 非响应式 DOM 引用容器：仅动画查询使用，避免 TransitionGroup + ref 回写触发递归更新 */
function setGameTreasureSlotRef(index, el) {
  const node = refToDom(el);
  if (node) {
    gameTreasureSlotRefs[index] = node;
  } else {
    gameTreasureSlotRefs[index] = undefined;
  }
}
const wordSlotsWrapRef = ref(null);
const submitBtnRef = ref(null);
const submitBookmarkRef = ref(null);
const gamePanelPlayfieldRef = ref(null);
/** runSaveBridge / hydrate 用；onUnmounted 置 false */
let gamePanelAlive = true;
function getGamePanelAlive() {
  return gamePanelAlive;
}
const firstWordTutorialLayerRef = ref(null);

/** 仅用于 imperative 写 --slot-scale，避免 RAF 每帧改 ref 触发整面板重渲染 */
const wordSlotsScaleRootRef = ref(null);
const flyLetterRef = ref(null);

/** InRunPlayfield defineExpose：父级读到的可能是 Ref，也可能已是 HTMLElement */
function resolvePlayfieldExposeDom(exposed) {
  return refToDom(unref(exposed)) ?? null;
}

watchEffect(() => {
  const playfield = gamePanelPlayfieldRef.value;
  const runHeaderBar = resolvePlayfieldExposeDom(playfield?.runHeaderBarRef);
  levelTitleBoxRef.value = resolvePlayfieldExposeDom(runHeaderBar?.levelTitleBoxRef);
  wordSlotsWrapRef.value = resolvePlayfieldExposeDom(playfield?.wordSlotsWrapRef);
  wordSlotsScaleRootRef.value = resolvePlayfieldExposeDom(playfield?.wordSlotsScaleRootRef);
  wordTranslationWrapRef.value = resolvePlayfieldExposeDom(playfield?.wordTranslationWrapRef);
  wordTranslationInnerRef.value = resolvePlayfieldExposeDom(playfield?.wordTranslationInnerRef);
  // 保留 TreasureBarRow 组件实例（getExpandBtnEl / getContainerEl）；勿 refToDom
  gameTreasureBarRowRef.value = unref(playfield?.gameTreasureBarRowRef) ?? null;
  letterGridWrapRef.value = resolvePlayfieldExposeDom(playfield?.letterGridWrapRef);
  letterGridRef.value = resolvePlayfieldExposeDom(playfield?.letterGridRef);
  deckBtnRef.value = resolvePlayfieldExposeDom(playfield?.deckBtnRef);
  hintBtnRef.value = resolvePlayfieldExposeDom(playfield?.hintBtnRef);
  submitBookmarkRef.value = resolvePlayfieldExposeDom(playfield?.submitBookmarkRef);
  submitBtnRef.value = resolvePlayfieldExposeDom(playfield?.submitBtnRef);
});

function removeDeckLettersByRawsWithTreasureNotify(raws) {
  removeDeckLetterInstancesByRaws(raws);
  void ctrlEarly.notifyTreasureDeckCardsRemovedByRaws(raws);
  flushDeckMultisetAchievements();
}

const treasureSlotsLayoutClass = computed(() => {
  const count = ctrlEarly.displayOwnedTreasures.value.length;
  return resolveTreasureSlotsLayoutClass(treasureInventoryCtrl.filledCount.value, count);
});

const flatGrid = computed(() => grid.value.flat());
const selectedLetters = computed(() => selectedTiles.value.map(({ tile }) => tile));

/** 计算目标并写 DOM；deltaMs 为数字时用 expo.out 风格插值，为 true 时直接 snap（首帧防闪） */
function updateSlotPositions(deltaMs) {
  pfUpdateSlotPositions(deltaMs);
}

function findFirstOwnedTreasureSlotIndex(treasureId) {
  const arr = ownedTreasures.value;
  for (let i = 0; i < arr.length; i += 1) {
    if (arr[i]?.treasureId === treasureId) return i;
  }
  return -1;
}

/** @type {{ current: ReturnType<typeof import('../composables/useDeckPreviewLayer.js').useDeckPreviewLayer> | null }} */
const deckPreviewBridge = { current: null };

/** 暂停选项层 portal（assembly 后回填） */
let openPauseOptionsPortal = () => {};

/** assembly 前占位；`wireGamePanelSettlement` 后接 `runSaveBridge` */
const runAutoSaveBridge = {
  tryFlush: (_opts) => {},
  flushRunSaveNow: () => {},
};

function wireBossMechanicsBridge(bossMechanicsCtrl) {
  bossSlugBridge.fn = () => bossMechanicsCtrl.slug();
  bossDebuffBridge.fn = () => bossMechanicsCtrl.getBossTileDebuffContext();
  bossTapeTriggerCueDispatch = bossMechanicsCtrl.onBossTapeTriggerCue;
  bossRestrictionTreasureCueDispatch = bossMechanicsCtrl.onBossRestrictionTreasureCue;
  bossMechanicsBridge.playBossTapeTriggerCue = () => bossMechanicsCtrl.playBossTapeTriggerCue();
  bossMechanicsBridge.refreshBossTileDebuffOnTile = (tile) =>
    bossMechanicsCtrl.refreshBossTileDebuffOnTile(tile);
  bossMechanicsBridge.applyHookBossAfterSubmit = () => bossMechanicsCtrl.applyHookBossAfterSubmit();
  bossMechanicsBridge.pickCrimsonDisabledTreasureSlotIndex = () =>
    bossMechanicsCtrl.pickCrimsonDisabledTreasureSlotIndex();
  bossMechanicsBridge.evaluateOxBossHit = (judgedLen, counts) =>
    bossMechanicsCtrl.evaluateOxBossHit(judgedLen, counts);
  bossMechanicsBridge.isCrimsonTreasureSlotDisabled = (i) =>
    bossMechanicsCtrl.isCrimsonTreasureSlotDisabled(i);
  bossMechanicsBridge.isAmberBossMaskActive = () => bossMechanicsCtrl.isAmberBossMaskActive.value;
  bossMechanicsBridge.isCrimsonBossMechanicsActive = () =>
    bossMechanicsCtrl.isCrimsonBossMechanicsActive.value;
  bossMechanicsBridge.isManacleBossGrid = () => bossMechanicsCtrl.isManacleBossGrid.value;
  bossMechanicsBridge.buildBossWildcardResolveContext = () =>
    bossMechanicsCtrl.buildBossWildcardResolveContext();
  bossMechanicsBridge.onVerdantTreasureSold = () => bossMechanicsCtrl.onVerdantTreasureSold();
  bossMechanicsBridge.onBossKeySold = () => bossMechanicsCtrl.onBossKeySold();
}

const ctrlLate = wireGamePanelControllers({
  phase: "late",
  grid,
  selectedTiles,
  selectedOrder,
  ownedSlotTreasureIdList,
  rarityLevelsByRarity,
  resolvedWordForSubmit,
  effectiveWordForSubmit,
  effectiveWordPartsForSubmit,
  buildEffectiveWordPartsForSubmit,
  resolveWordFromEffectiveParts,
  listEffectiveTilesForSubmit,
  getPlayfieldFlySnapshot,
  bossSlugForMechanics,
  getBossTileDebuffContext,
  firstWordTutorialActive,
  firstWordTutorialCtrlSlot,
  getSaveSlotIndex: () => props.saveSlotIndex,
  dictionaryReady,
  ownedTreasureHookFxBridge,
  getWordDefinition,
  triggerHaptic,
  dictFatalError,
  transitionBusy,
  scoringAnimating,
  gridRefillAnimating,
  isRunFlowOverlayOpen,
  refToDom,
  runOverlayHostRef,
  treasureDetail,
  deckPreviewBridge,
  isBlockingPauseOpen,
  isFirstWordTutorialBlockingInput,
  openPauseOptionsPortal: () => openPauseOptionsPortal(),
  bumpOverlayZ,
  shopPortalZ,
  requestNewRun,
  openSettings,
  runAutoSave: runAutoSaveBridge,
  abandonStandardWinRunProgressIfNeeded,
  emitExitToMenu: () => emit("exit-to-menu"),
  openRunEnd,
  showShop,
  showInfoLayer,
  devTreasurePickerItems,
  devSpellPickerItems,
  walletHeaderShown,
  pillarUsedDeckUids,
  verdantTreasureSold,
  bossMechanicsSuppressed,
  activeBossSlug,
  ownedTreasures,
  treasureRunState,
  ROWS,
  COLS,
  touchGrid,
  runRandom,
  usedWordLengthsThisBoss: ctrlEarly.usedWordLengthsThisBoss,
  mouthLockedLengthBoss: ctrlEarly.mouthLockedLengthBoss,
  clubRequiredKeyBoss: ctrlEarly.clubRequiredKeyBoss,
  getWordLetterCount,
  judgedLengthTableLenForRun,
  listEffectiveTilesForSubmit,
  crimsonTreasureDisabledSlotIndex,
  gamePanelPlayfieldRef,
  showDeckLayer,
  deckStacksView,
  deckCount,
  initialDeckSnapshot,
  overlayStackController,
  deckCardRaw,
  resolveLetterFromRaw,
  getRarityForLetter,
  normalizeExclusiveTileAccessoryPair,
  lengthLevelsByLength,
  lengthUpgradeObservatoryExtra,
  spellCountsByLength,
  getWordLengthScoreForTableLen,
  getLengthMultiplier,
  scaleLengthContributionForBoss,
  notifyBossRestrictionTreasures: ctrlEarly.notifyBossRestrictionTreasures,
  wireBossMechanicsBridge,
});

const {
  showPauseOptions,
  showDeveloperOptions,
  developerOptionsLayerRef,
  openPauseOptions,
  openPauseOptionsFromShop,
  pauseOverlaySession,
  bossMechanicsCtrl,
  deckPreview,
  runResultPresentationCtrl,
} = ctrlLate;

tileDetailCtrl = ctrlLate.tileDetailCtrl;

/** 暂停 ↔ 开发者切换时「仍有浮层」：只对开/关边沿 enter/exit，避免 pauseDepth 累加导致 GSAP 永冻 */
watch(ctrlLate.gamePauseOverlayOpen, (open, wasOpen) => {
  if (open) {
    if (!wasOpen) enterGamePause();
    return;
  }
  if (wasOpen) {
    releaseAllGamePause();
    ensureSlotRafRunning();
  }
});

watchEffect(() => {
  const playfield = gamePanelPlayfieldRef.value;
  // ResultArea 须保留组件实例（getTotalEl / getScoreNumEl 等），不能 refToDom 成根节点
  runResultPresentationCtrl.syncGameResultAreaRef(
    unref(playfield?.gameResultAreaRef) ?? null,
  );
});

/** 仅当当前是有效词时允许提交等 */
const effectiveWordValid = computed(() => {
  return resolvedWordForSubmit.value != null;
});

openPauseOptionsPortal = overlayStackController.openPauseOptionsPortal;

function buildRunPhaseMachineInput() {
  return {
    showShop: showShop.value,
    showSettlement: showSettlement.value,
    showRunEnd: showRunEnd.value,
    showPauseOptions: showPauseOptions.value,
    showDeveloperOptions: showDeveloperOptions.value,
    runEndOutcome: runEndOutcome.value,
    transitionBusy: transitionBusy.value,
    shopOverlayLayersSuppressed: shopOverlayLayersSuppressed.value,
    scoringAnimating: scoringAnimating.value,
    gridRefillAnimating: gridRefillAnimating.value,
    submitWordBusy: submitWordBusy.value,
    shopUpgradeAnimating: shopPhase.shopUpgradeAnimating.value,
    dictionaryReady: dictionaryReady.value,
    resolvedWordForSubmitReady: resolvedWordForSubmit.value != null,
    remainingWords: remainingWords.value,
    firstWordTutorialBlocking: firstWordTutorialCtrlSlot.ctrl?.blocking?.value ?? false,
    firstWordTutorialPhase: firstWordTutorialCtrlSlot.ctrl?.phase?.value ?? null,
    firstWordTutorialRetryHintSubmitReady:
      firstWordTutorialCtrlSlot.ctrl?.retryHintSubmitReady?.value ?? false,
    isFirstWordTutorialBlockingInput: isFirstWordTutorialBlockingInput(),
    flyingLettersCount: playfieldFlyingLettersCount(),
    flyingBackBatchesCount: playfieldFlyingBackBatchesCount(),
    packPickSessionOpen: !!packPickSession.value,
    spellTargetOpen: !!spellTargetSession.value,
  };
}

phaseStore = createPhaseStore({
  transitionBusy,
  shopOverlayLayersSuppressed,
  getMachineInput: buildRunPhaseMachineInput,
});

function mountGamePanelSessionNamespaces(extraNamespaces = {}) {
  mountRunSessionNamespaces(session, {
    phase: phaseStore,
    ...extraNamespaces,
  });
}

mountGamePanelSessionNamespaces();

const canSubmit = computed(() => {
  return phaseStore.canSubmitWord();
});

function sleep(ms) {
  return pauseAwareDelay(ms);
}

function onTreasureDetailClose() {
  if (spellGrantDetailCloseHandler()) return;
  treasureDetail.value = null;
}

function onTreasurePurchase() {
  ctrlEarly.shopTransactionCtrl.purchase();
}

function onTreasureSell() {
  ctrlEarly.shopTransactionCtrl.sell();
}

function maybeReportTapTapBestSingleWordScore(score) {
  if (isEndlessRun.value) return;
  const sc = Math.max(0, Math.floor(Number(score) || 0));
  if (sc <= 0) return;
  const patch = patchActiveSlotCareer;
  if (typeof patch !== "function") return;
  patch((career) => {
    const prev = Math.max(0, Math.floor(Number(career.taptapReportedBestSingleWordScore) || 0));
    if (reportBestSingleWordScoreIfImproved(sc, prev)) {
      career.taptapReportedBestSingleWordScore = Math.max(prev, sc);
    }
  });
}

/** @param {HTMLElement} el @param {number} sp */
async function awaitTreasureSlotWobbleElForSubmit(el, sp) {
  const wobbleTl = createWobbleScoreSlotTimeline(el);
  if (wobbleTl) {
    wobbleTl.timeScale(sp);
    wobbleTl.play(0);
  }
  await awaitWobbleScoreSlotTimeline(wobbleTl);
}

/** @type {() => Promise<void>} settlement flow 前向引用（submit controller 回调） */
let openStageSettlementSlot = async () => {};

function scheduleRunAutoSave() {
  runSaveBridge?.scheduleAutoSave?.();
}

const { ports: gamePanelPorts } = setupGamePanelAssembly(
  buildGamePanelAssemblyFromWiring({
    gp: {
      COLS,
      ROWS,
      SHOW_SUBMIT_TRANSLATION,
      props,
      emit,
      session,
      phaseStore,
      getGamePanelAlive,
      mountGamePanelSessionNamespaces,
      firstWordTutorialCtrlSlot,
    },
    ctrlEarly,
    ctrlLate,
    overlayStackController,
    playfieldSubmit,
    game: {
      grid,
      gridIntroDone,
      gridRefillAnimating,
      gridTileRefs,
      selectedOrder,
      selectedTiles,
      selectTile,
      removeFromSlot,
      removeSingleTileFromWord,
      insertSelectedTileAt,
      reorderSelectedOrder,
      removeSelectedLetters,
      touchGrid,
      snapshotGridCellsByTileId,
      syncPlayerMarkBatchCounterFromGrid,
      ceruleanBellSlotIndex,
      finalizeCeruleanBellSlotIndex,
      ensureCeruleanBellMarkedOnGrid,
      findCeruleanBellLockedTileOnGrid,
      markTileAsWildcard,
      remapTileFromRawLetter,
      refreshGridTileBaseScoresFromLevels,
      deck,
      deckCount,
      exportDeckState,
      hydrateDeckState,
      initialDeckSnapshot,
      removeDeckCardByUid,
      removeDeckCardByUidAndNotify,
      removeDeckCardsForSubmittedWord,
      removeDeckCardsForSubmittedWordAndNotify,
      removeDeckLetterInstancesByRaws,
      removeDeckLettersByRawsWithTreasureNotify,
      appendShopDeckEntries,
      remainingRemovals,
      remainingWords,
      hintRemaining,
      pendingHintChargeWord,
      basketballWordsSubmitted,
      dictFatalError,
      dictionaryReady,
      ownedTreasures,
      ownedUpgrades,
      ownedVoucherIds,
    },
    playfield: {
      flatGrid,
      ensureSlotRafRunning,
      updateSlotPositions,
      letterGridRef,
      letterGridWrapRef,
      wordSlotRefs,
      wordSlotsWrapRef,
      wordSlotsScaleRootRef,
      submitBtnRef,
      submitBookmarkRef,
      getGridTileElByIndex,
      getSelectedGridCellElsInOrder,
      wordSelectionSwapBusy,
      flyingLetters,
      flyingBackBatches,
      deckBtnRef,
      hintBtnRef,
      deckPreview,
      getInRunDeckFlyTargetEl,
      refreshBossTileDebuffOnTile,
      isManacleBossGrid,
    },
    shop: {
      showShop,
      shopPanelRef,
      shopPortalZ,
      shopPortalStackStyle: ctrlEarly.shopPortalStackStyle,
      shopOverlayLayersSuppressed,
      shopInteractionsDisabled,
      shopSelectionBridge,
      shopSpellRuntimeBridge,
      openShopPackSession,
      runInRunUpgradePlaybackSteps,
      runInRunUpgradeStaircasePlayback,
      buildInRunLengthUpgradeStep,
      fulfillPackInnerPurchase,
      packPickSession,
      packPickBusy,
      packPickSkipBusy,
      packPickOverlaySuppressed,
      packPickOptionKeyOf,
      packPickRequiredPicks,
      runInRunPackPickFlow,
      onPackInnerClaim,
      onPackPickSkip,
      ensurePackPickOverlayVisible,
      shouldRestorePackPickOverlayAfterSpellConfirm,
    },
    treasureExtras: {
      ownedSlotTreasureIdList,
      treasureDetail,
      treasureRunState,
      treasureSlotsLayoutClass,
      treasureGemClass,
      findFirstOwnedTreasureSlotIndex,
      grantRandomShopTreasure: treasureInventoryCtrl.grantRandom,
      grantRandomShopTreasureByRarity: treasureInventoryCtrl.grantRandomByRarity,
      runTreasurePackOpenPrecursor,
      runHourglassStageEndFx,
      runLevelEndPreSettlementFx,
      pickCrimsonDisabledTreasureSlotIndex,
      crimsonTreasureDisabledSlotIndex,
      runDetachedTileShrinkReplacePop,
      treasureOriginRectFromEl,
    },
    runExtras: {
      runMatchStats,
      runDiscoveryLog,
      runPresetId,
      runDifficultyIndex,
      runRandom,
      runRng,
      runEndCtrlSlot,
      runEndEnterEndlessImpl: invokeRunEndEnterEndless,
      runEndFlowHostRef,
      levelIndex,
      money,
      targetScore,
      currentScore,
      isEndlessRun,
      activeBossSlug,
      bossSlugForMechanics,
      achievementRunState,
      mergeCareerOnRunEnd,
      beginFirstWordTutorialAfterGridSettled,
      lengthLevelsByLength,
      lengthUpgradeObservatoryExtra,
      rarityLevelsByRarity,
      spellCountsByLength,
      recordSpellWordLength,
      lastReplayableSpellId,
      spellCastHistory,
      judgedLengthTableLenForRun,
      runWordLengthJudgmentPenalty,
      setRunWordLengthJudgmentPenalty,
      setWordLengthLevel,
      setRarityLevelWithTreasurePairs,
      bumpWordLengthLevel,
      noteCollectionAccessoryAcquired: ctrlEarly.noteCollectionAccessoryAcquired,
      noteCollectionDiscovery: ctrlEarly.noteCollectionDiscovery,
      noteCollectionMaterialAcquired,
      noteCollectionUpgradeForWordLen,
      noteCollectionUpgradeFromRandomPick: ctrlEarly.noteCollectionUpgradeFromRandomPick,
      noteCollectionUpgradeUsed: ctrlEarly.noteCollectionUpgradeUsed,
      noteCollectionWordSubmitted,
      noteDiscardExhaustedForChapterUnlock: ctrlEarly.noteDiscardExhaustedForChapterUnlock,
      playBossTapeTriggerCue,
      isAmberBossMaskActive,
      isCrimsonBossMechanicsActive,
      evaluateOxBossHit,
      getBossTileDebuffContext,
      pillarUsedDeckUids,
      verdantTreasureSold,
    },
    overlay: {
      showDeckLayer,
      showInfoLayer,
      showPauseOptions,
      showSettlement,
      showRunEnd,
      showTreasureCollectionLayer,
      openInfoModal: ctrlEarly.openInfoModal,
      openPauseOptions,
      openPauseOptionsFromShop,
      openRunEnd,
      openStageSettlementSlot,
      setGameTreasureSlotRef,
      runOverlayHostRef,
      gamePanelPlayfieldRef,
      firstWordTutorialLayerRef,
      spellTargetSession,
      spellReferencePreview,
      spellGrantDetailCloseHandler,
      pendingSpellTileAppearanceAnim,
      wordTranslationInnerRef,
      wordTranslationWrapRef,
      transitionBusy,
      isRunFlowOverlayOpen,
      isFirstWordTutorialBlockingInput,
      isGamePaused,
      showToast,
    },
    scoringExtras: {
      canSubmit,
      buildSubmitAfterLettersContext,
      applySubmitRefill,
      applyHookBossAfterSubmit,
      deferredWordSubmitPayload: deferredWordSubmitPayloadBox,
      submitWordBusy,
      submitDeltaKey,
      submitTranslationLines,
      scoringAnimating,
      scoringLetterIndex,
      scoringTreasureBarIndex,
      flashSubmitCountDelta,
      scheduleStaggeredTileRemoveHaptics,
      getWordDefinition,
      setLastWordFromSubmit,
      flushDeferredWordSubmitRecord,
      flushSubmitAchievements: ctrlEarly.flushSubmitAchievements,
      flushAchievementUnlocks,
    },
    fx: {
      pulseFill: ctrlEarly.pulseFill,
      pulseFormulaPanelNum: ctrlEarly.pulseFormulaPanelNum,
      pulseFormulaMultMultiplyBurst: ctrlEarly.pulseFormulaMultMultiplyBurst,
      showScoreBubble,
      wobbleScoreSlot,
      createWobbleScoreSlotTimeline,
      awaitWobbleScoreSlotTimeline,
      triggerAccessoryChipRipple: ctrlEarly.triggerAccessoryChipRipple,
      showMultMultiplyBubble: ctrlEarly.showMultMultiplyBubble,
      scheduleSmallPlusBubbleOutro,
      scheduleMultMultiplyBubbleOutro: ctrlEarly.scheduleMultMultiplyBubbleOutro,
      formatMoneyBubbleLabel,
      clearAllTreasureSlotWobbleFront: ctrlEarly.clearAllTreasureSlotWobbleFront,
      scoreBubbleAnchorRect,
      wobbleGameTreasureSlot,
    },
  }),
);

const panelAssembly = useGamePanelSessionAssembly({
  ports: gamePanelPorts,
  openStageSettlement: (...args) => openStageSettlementSlot(...args),
  hooks: {
    sleep,
    playOwnedTreasureMoneyFx,
    ownedTreasureHookFxBridge,
    playOwnedTreasureWobbleOnlyFx,
    playOwnedTreasureMultDeltaFx,
    playSubmitWordLetterRemoveAndRewardLeave,
    playTreasureSlotScoreBurstAtPeak,
    playTreasureSlotBubbleBurstAtPeak,
    runSubmittedIceShatterEffects,
    maybeReportTapTapBestSingleWordScore,
    onTreasureDetailClose,
  },
});

const {
  firstWordTutorialCtrl,
  firstWordTutorialPhase,
  firstWordTutorialBlocking,
  firstWordTutorialTreasureDetailStackZFloor,
  maybeEndShopTutorialOnTreasurePurchase,
  onShopOpenedAfterEnter,
  startFirstWordTutorialDevTest,
  disposeFirstWordTutorial,
  playfieldController,
  discardController,
  spellCastController,
  runSaveBridge,
  runEndCtrl,
} = panelAssembly;

Object.assign(shopSelectionBridge, {
  _present: presentTreasureDetail,
  _buildNav: ctrlEarly.buildShopOwnedPreviewNavItems,
  _blocked: firstWordTutorialCtrl.isShopTutorialBlockedShopInteraction,
  _maybeEnd: firstWordTutorialCtrl.maybeEndShopTutorialOnOfferOpen,
  _phase: () => firstWordTutorialCtrl.phase.value,
  _getDetail: () => treasureDetail.value,
  _clearDetail: () => {
    treasureDetail.value = null;
  },
  _getLayer: () => resolveRunOverlayChildLayer(runOverlayHostRef.value?.treasureDetailLayerRef),
});

runAutoSaveBridge.tryFlush = (opts) => runSaveBridge?.tryFlush?.(opts);
runAutoSaveBridge.flushRunSaveNow = () => runSaveBridge?.flushRunSaveNow?.();

({
  packPickController, packPickSession, packPickBusy, packPickSkipBusy, packPickOverlaySuppressed,
  packPickOptionKeyOf, packPickRequiredPicks, runInRunPackPickFlow, onPackPickSkip, onPackInnerClaim,
  fulfillPackInnerPurchase, ensurePackPickOverlayVisible, shouldRestorePackPickOverlayAfterSpellConfirm,
  openShopPackSession, runEndCtrlSlot, spellGrantDetailCloseHandler, queueOrRunSpellTileAppearanceAnim,
  runSpellPreviewChain, runSpellPreviewChainAfterDetailClose, runInRunSpellGrant, onSpellTargetConfirm,
  onSpellTargetCancel,
} = wireGamePanelPostAssembly({
  panelAssembly,
  firstWordTutorialCtrlSlot,
  firstWordTutorialActive,
  shopSpellRuntimeBridge,
  shopTransactionCtrl: ctrlEarly.shopTransactionCtrl,
  playfieldActionsRef,
  devCommandsRef,
  devCommandsOptions: buildGamePanelDevCommandsOptions({
    maskBubbleDevScenarioActive, allIceDevScenarioActive, ceruleanBellDevScenarioActive,
    pagerDevScenarioActive, ectoplasmDevScenarioActive, noSellGoldBombCometDevScenarioActive,
    mouthQuProblemDevScenarioActive,
    promoScreenshotDevPresetActive, ownedTreasures, transitionBusy,
    showShop, showSettlement, showRunEnd, showPauseOptions, showDeveloperOptions, levelIndex,
    pendingBossSlugOverride: ctrlEarly.pendingBossSlugOverride,
    gridIntroDone, gridRefillAnimating, gridTileRefs,
    glyphShopSkipLevelAdvance: ctrlEarly.glyphShopSkipLevelAdvance,
    runDifficultyIndex, money, shopOverlayLayersSuppressed, packPickOverlaySuppressed, packPickSession,
    debugScoreCardTargetOverride: ctrlEarly.debugScoreCardTargetOverride,
    debugScoreCardRoundOverride: ctrlEarly.debugScoreCardRoundOverride,
    dictionaryReady, ROWS, COLS,
    buildOwnedTreasureSlot, currentLevel, getRunLevelAtIndex, getRunLevelIndexForId,
    resetLevelAfterTreasurePrep, resetDeckAfterStageEnd,
    runPendingAfterGridTilesSettled: ctrlEarly.runPendingAfterGridTilesSettled,
    runGridIntroAfterReset,
    playLevelAdvanceHeaderFx: ctrlEarly.playLevelAdvanceHeaderFx,
    touchGrid, updateSlotPositions, scheduleRunAutoSave, nextTick, runRandom,
    shopPhase, loadDictionary, getGamePanelAlive: () => gamePanelAlive, isWildcardMaterialTile,
    getCandidateWordsByLength, resolveWordPattern, rarityLevelsByRarity, buildBossWildcardResolveContext,
    grantRandomOwnedTreasuresInRunWithPopAnim: ctrlEarly.grantRandomOwnedTreasuresInRunWithPopAnim,
    tryCeruleanBellMarkAfterGridStable, grid,
    treasureRunState, remainingWords,
    runTreasureLevelCompleteHooks: ctrlEarly.runTreasureLevelCompleteHooks,
    selectTile, removeFromSlot, selectedOrder, submitWord: panelAssembly.submitController.submitWord,
    scoringAnimating, gridRefillAnimating, submitWordBusy,
  }),
}));

wireOverlayViewContext(overlayStackController, {
  props,
  treasureDetail,
  packPickSession,
  packPickOptionKeyOf,
  packPickRequiredPicks,
  money,
  levelIndex,
  shopPhase,
  canPlaceTreasureOffer: ctrlEarly.canPlaceTreasureOffer,
  walletHeaderShown,
  rarityLevelsByRarity,
  firstWordTutorialTreasureDetailStackZFloor,
  showTreasureCollectionLayer,
  isAmberBossMaskActive,
  treasureInventoryCtrl,
  showEmptyTreasureSlotHelp,
  showInfoLayer,
  infoModalInitialTab: ctrlEarly.infoModalInitialTab,
  showPauseOptions: ctrlLate.showPauseOptions,
  spellCountsByLength,
  lengthLevelsByLength,
  lengthUpgradeObservatoryExtra,
  currentLevel,
  showShop,
  infoModalNextLevelId: ctrlEarly.infoModalNextLevelId,
  getRunSeedNumeric,
  activeBossSlug,
  spellReferencePreview,
  tileDetailCtrl,
  onTreasureDetailClose,
  onTreasurePurchase,
  onTreasureSell,
  clearSpellReferencePreview: () => {
    spellReferencePreview.value = null;
  },
  closeTreasureCollectionLayer: () => {
    showTreasureCollectionLayer.value = false;
  },
  closeEmptyTreasureSlotHelp: () => {
    showEmptyTreasureSlotHelp.value = false;
  },
  onInfoSelectOwnedVoucher,
  onPauseContinue: ctrlLate.onPauseContinue,
  onPauseNewRun: ctrlLate.onPauseNewRun,
  onPauseSettings: ctrlLate.onPauseSettings,
  onPauseDeveloperOptions: ctrlLate.onPauseDeveloperOptions,
  onPauseMainMenu: ctrlLate.onPauseMainMenu,
  treasureGemClass,
});

const {
  onDeveloperConvertDeck, onDeveloperJumpLevel, onDeveloperJumpBossShop, onDeveloperGrantTreasures,
  onDeveloperCastSpell,
  onDeveloperSetBalance,
} = createGamePanelDevHandlers({
  ownedTreasures,
  findTreasurePlacementIndex: ctrlEarly.findTreasurePlacementIndex,
  buildOwnedTreasureSlot,
  noteCollectionTreasureAcquired: ctrlEarly.noteCollectionTreasureAcquired,
  applyTreasureAcquireImmediateEffectsForRun: ctrlEarly.applyTreasureAcquireImmediateEffectsForRun,
  treasureRunState, deck, grid, ROWS, COLS, runRandom,
  money,
  runWalletFloor: shopPhase.runWalletFloor,
  rarityLevelsByRarity, touchGrid, scheduleRunAutoSave, developerOptionsLayerRef, devCommandsRef,
  resetDeckAfterStageEnd,
  showDeveloperOptions,
  showPauseOptions,
  showShop,
  nextTick,
  runInRunSpellGrant,
});

Object.assign(pauseOverlaySession, {
  onDeveloperConvertDeck,
  onDeveloperJumpLevel,
  onDeveloperJumpBossShop,
  onDeveloperGrantTreasures,
  onDeveloperCastSpell,
  onDeveloperSetBalance,
});

wireGamePanelFxFromDeps({
  ownedBarFxRef, nextTick, findOwnedTreasureSlotIndex,
  findAllOwnedTreasureSlotIndices: ctrlEarly.findAllOwnedTreasureSlotIndices,
  treasureInventoryCtrl, shopOverlayLayersSuppressed, scoringTreasureBarIndex, money,
  wobbleGameTreasureSlot, wobbleScoreSlot, showScoreBubble, scheduleSmallPlusBubbleOutro,
  formatMoneyBubbleLabel, bumpOverlayZ, scoringLetterGapMs: SCORING_LETTER_GAP_MS,
  treasureDestroyFxRef, treasureLevelCompleteFxRef, ownedTreasureHasNoSellAccessory,
  isTreasureBarSlotVisible, ownedTreasures, grid, ROWS, COLS, getGridTileElByIndex, touchGrid,
  scoreBubbleAnchorRect,
  clearOwnedTreasureSlotLeaveGapAtIndex: (ix) =>
    ctrlEarly.treasureRun?.clearOwnedTreasureSlotLeaveGapAtIndex(ix),
  removeOwnedTreasureSlotsLeaveGapAtIndices: (indices, opts) =>
    ctrlEarly.treasureRun?.removeOwnedTreasureSlotsLeaveGapAtIndices(indices, opts),
  scheduleRunAutoSave,
  createWobbleScoreSlotTimeline, awaitWobbleScoreSlotTimeline, playOwnedTreasureWobbleOnlyFx,
  hourglassStageFxRef, inRunUpgradePlaybackRef, runResultPresentationCtrl, sleep,
  submitAccessoryUpgradeBatchState,
  submitTileLeaveFxRef, treasureRunState, getSelectedGridTileElsInOrder,
  getWordSlotRefs: getWordSlotRefsFromPlayfield, runRandom,
  isBossTileDebuffed, removeDeckCardByUidAndNotify, ownedSlotTreasureIdList, ownedTreasureHookFxBridge,
  playTreasureSlotBubbleBurstAtPeak, playOwnedTreasureMoneyFx, triggerHaptic,
  awaitTreasureSlotWobbleElForSubmit, runDetachedTileShrinkReplacePop,
  onBombBlastResolved: ({ destroyedOtherTreasures }) => {
    if (!destroyedOtherTreasures) ctrlEarly.noteAchievementSafeBombBlast();
  },
  onVolcanoEruptionPlayed: () => {
    ctrlEarly.noteAchievementVolcanoEruption();
  },
});

const {
  openStageSettlement,
  onSettlementContinue,
  enterEndlessModeAfterWin: enterStageSettlementEndlessFlow,
} = wireGamePanelSettlement({
  runSaveBridge,
  money,
  stageRewardYuan: ctrlEarly.stageRewardYuan,
  remainingWords,
  remainingRemovals,
  ownedTreasures,
  runPresetId,
  ownedVoucherIds,
  showSettlement,
  disableSettlementLayerAnim: ctrlEarly.disableSettlementLayerAnim,
  settlementSnapshot: ctrlEarly.settlementSnapshot,
  settlementPortalZ: ctrlEarly.settlementPortalZ,
  bumpOverlayZ,
  scheduleOverlayPresent,
  scheduleOverlayDismiss,
  showDeckLayer,
  showPauseOptions,
  tileDetailCtrl,
  transitionBusy,
  showShop,
  resetDeckAfterStageEnd,
  playWalletHeaderGainAnim: ctrlEarly.playWalletHeaderGainAnim,
  shopPanelRef,
  flushAchievementUnlocks,
  recordAchievementRunInterest,
  achievementRunState,
  irisTransition,
  runHourglassStageEndFx,
  runLevelEndPreSettlementFx,
  runTreasureLevelCompleteHooks: ctrlEarly.runTreasureLevelCompleteHooks,
  ownedSlotTreasureIdList,
  recordPointerClientFromEvent,
  triggerHaptic,
  nextTick,
  settlementLayerRef,
  mountGamePanelSessionNamespaces,
  pauseOverlaySession,
  session,
});

openStageSettlementSlot = openStageSettlement;

onBeforeMount(() => {
  if (!isRunSessionReadyForHosts(session)) {
    throw new Error("GamePanel: RunSession incomplete before host mount");
  }
  runSessionHostsReady.value = true;
});

const runAutoSave = {
  scheduleAutoSave: () => runSaveBridge.scheduleAutoSave(),
  tryFlush: (...args) => runSaveBridge.tryFlush(...args),
  cancelPending: () => runSaveBridge.cancelPending(),
  flushRunSaveNow: () => runSaveBridge.flushRunSaveNow(),
};

const { platformCtrl, disposeGamePanel } = wireGamePanelPlatform({
  transitionBusy,
  shopPhase,
  packPickBusy,
  packPickSkipBusy,
  submitWordBusy,
  scoringAnimating,
  gridRefillAnimating,
  spellTargetSession,
  bossRerollSession,
  packPickSession,
  spellReferencePreview,
  treasureDetail,
  tileDetailCtrl,
  showShop,
  showDeckLayer,
  showInfoLayer,
  showPauseOptions,
  showDeveloperOptions,
  developerOptionsLayerRef,
  closeDeveloperOptions: ctrlLate.closeDeveloperOptions,
  showSettlement,
  showRunEnd,
  dictFatalError,
  isBlockingPauseOpen,
  onSpellTargetCancel,
  dismissBossRerollOnBack: ctrlEarly.dismissBossRerollOnBack,
  onPackPickSkip,
  openPauseOptionsFromShop,
  closePauseOptions: ctrlLate.closePauseOptions,
  settlementIntroPending: ctrlEarly.settlementIntroPending,
  finishSettlementIntroInstant: ctrlEarly.finishSettlementIntroInstant,
  onSettlementContinue,
  openPauseOptions,
  onTreasureDetailClose,
  runOverlayHostRef,
  onWordSlotsLayoutResize,
  disposeFirstWordTutorial,
  resetGamePause,
  runAutoSave,
  discardController,
  setGamePanelAlive: (v) => {
    gamePanelAlive = v;
  },
  settlementLayerRef,
  disposeSettlementWalletGainAnim: ctrlEarly.disposeSettlementWalletGainAnim,
  disposeHeaderDomFx: ctrlEarly.disposeHeaderDomFx,
  disposeSubmitCountDeltaTimer,
});

async function enterEndlessModeAfterWin() {
  await enterStageSettlementEndlessFlow(() => {
    showRunEnd.value = false;
    isEndlessRun.value = true;
    syncEndlessLeaderboardChapterBaseline(currentLevel.value?.id ?? "");
  });
  runSaveBridge?.flushRunSaveNow?.();
}

runEndEnterEndlessSlot = enterEndlessModeAfterWin;

function treasureGemClass(rarity) {
  return treasureGemClassForRarity(rarity);
}

watch(
  () => selectedLetters.value.length,
  () => {
    nextTick(() => updateSlotPositions(true));
  },
);

watch(isEndlessRun, (endless) => {
  if (!endless) {
    ctrlEarly.resetTapTapLeaderboardRunTracking();
    return;
  }
  syncEndlessLeaderboardChapterBaseline(currentLevel.value?.id ?? "");
});

async function startGamePanelFromRestoredSave(restored) {
  return startGamePanelFromRestoredSaveRunner(buildGamePanelBootstrapDeps(buildGamePanelBootstrapSource()), restored);
}

async function startGamePanelNewRun() {
  return startGamePanelNewRunRunner(buildGamePanelBootstrapDeps(buildGamePanelBootstrapSource()));
}

function buildGamePanelBootstrapSource() {
  return createGamePanelBootstrapSource({
    shopPhase,
    runSaveBridge,
    ownedSlotTreasureIdList,
    treasureRunState,
    syncOwnedTreasureSlots: () => ctrlEarly.syncOwnedTreasureSlots(),
    syncShopUpgradesFreeFromOwnedTreasures,
    syncPlayerMarkBatchCounterFromGrid,
    rollRandomBigramForTreasure: ctrlEarly.rollRandomBigramForTreasure,
    registerMaskBubbleDevConsoleHook,
    setSlotRafLastTime: pfSetSlotRafLastTime,
    ensureSlotRafRunning,
    nextTick,
    setGridIntroDone: (v) => {
      gridIntroDone.value = v;
    },
    setGridRefillAnimating: (v) => {
      gridRefillAnimating.value = v;
    },
    getGridCellCount: () => ROWS * COLS,
    getGridTileEl: (i) => gridTileRefs.value[i],
    updateSlotPositions,
    getShowShop: () => showShop.value,
    scheduleRunAutoSave,
    flushAchievementUnlocks,
    setRunPresetId: (v) => {
      runPresetId.value = v;
    },
    getRunPresetIdProp: () => props.runPresetId,
    setRunDifficultyIndex: (v) => {
      runDifficultyIndex.value = v;
    },
    getRunDifficultyIndexForNewRun: () => props.restoredSave?.runDifficultyIndex,
    getRunDifficultyIndexProp: () => props.runDifficultyIndex,
    applyRunPresetStartEffects,
    isMaskBubbleDevScenarioActive: () => maskBubbleDevScenarioActive.value,
    applyMaskBubbleOwnedTreasures: () => devCommandsRef.current?.applyMaskBubbleDevRunStart(),
    isPagerDevScenarioActive: () => pagerDevScenarioActive.value,
    applyPagerOwnedTreasure: () => devCommandsRef.current?.applyPagerDevRunStart(),
    isEctoplasmDevScenarioActive: () => ectoplasmDevScenarioActive.value,
    applyEctoplasmDevOwnedTreasures: () => devCommandsRef.current?.applyEctoplasmDevRunStart(),
    isNoSellGoldBombCometDevScenarioActive: () => noSellGoldBombCometDevScenarioActive.value,
    applyNoSellGoldBombCometOwnedTreasures: () =>
      devCommandsRef.current?.applyNoSellGoldBombCometDevRunStart(),
    isMouthQuProblemDevScenarioActive: () => mouthQuProblemDevScenarioActive.value,
    applyMouthQuProblemOwnedTreasures: () =>
      devCommandsRef.current?.applyMouthQuProblemDevRunStart(),
    isCeruleanBellDevScenarioActive: () => ceruleanBellDevScenarioActive.value,
    applyCeruleanBellDevRunStart: () => devCommandsRef.current?.applyCeruleanBellDevRunStart(),
    getGamePanelAlive,
    getLevelIndex: () => levelIndex.value,
    resetLevelAfterTreasurePrep,
    runNewRunGridIntro: runGridIntroAfterReset,
    tryCeruleanBellFlyInAfterGridStable: () =>
      playfieldController.tryCeruleanBellFlyInAfterGridStable(),
    syncEndlessLeaderboardChapterBaseline,
  });
}

const panelBootstrap = useRunPanelBootstrap({
  registerPlatform: () => platformCtrl.register(),
  loadDictionary: () => loadDictionary({ shouldAbort: () => !gamePanelAlive }),
  getGamePanelAlive: () => gamePanelAlive,
  getRestoredSave: () => props.restoredSave,
  startFromRestoredSave: startGamePanelFromRestoredSave,
  startNewRun: startGamePanelNewRun,
  dispose: disposeGamePanel,
});

watchEffect(() => {
  document.documentElement.classList.toggle(
    "has-rarity-tier-merge",
    hasRarityTierMerge(ownedTreasures.value.map((s) => s?.treasureId ?? null)),
  );
});

onMounted(async () => {
  await panelBootstrap.start();
});
onUnmounted(() => {
  document.documentElement.classList.remove("has-rarity-tier-merge");
  panelBootstrap.dispose();
});
</script>
