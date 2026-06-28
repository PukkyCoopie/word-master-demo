import { computed, nextTick, provide } from "vue";
import gsap from "gsap";
import { DECK_PREVIEW_KEY } from "../components/run/deckPreviewKey.js";
import { coerceRunSeedNumeric } from "../game/runRng.js";
import { createGridDropAnim } from "../game/gridDropAnim.js";
import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { recordWordSubmit } from "../game/runMatchStats.js";
import { buildSettlementSnapshot } from "../game/buildSettlementSnapshot.js";
import { countOwnedRentalTreasures } from "../game/treasureHourglassRuntime.js";
import { applyWalletDeltaClamped } from "../treasures/treasureWalletFloor.js";
import { getUpgradeTreasureIdForRarityKey } from "../collection/collectionUpgradeCatalog.js";
import { noteTreasureRunUpgradeUsed } from "../treasures/treasureRunTracking.js";
import { isLengthObservatoryBoosted } from "../vouchers/voucherRuntime.js";
import { parseTranslationLines } from "../dictionary/parseTranslationLines.js";
import { notifySubmitAfterLettersBeforePostSteps } from "../treasures/treasureRegistry.js";
import { animateTreasureFrameFly } from "../game/shopOfferFlyAnim.js";
import { handleRunEndDiscoverySelect as handleRunEndDiscoverySelectPreview } from "../game/runEndDiscoveryPreview.js";
import { requestCloudSync } from "../save/cloudSave/cloudSaveSync.js";
import { clearSlotRunProgress } from "../save/runSaveStorage.js";
import { runLengthDowngradeShopLikeFx } from "../utils/runLengthDowngradeShopLikeFx.js";
import { runInGameRarityUpgradeShopLikeFx } from "../utils/runInGameRarityUpgradeShopLikeFx.js";
import { runClearWinLengthUpgradeShopLikeFx } from "../utils/runClearWinLengthUpgradeShopLikeFx.js";
import { resolvePresentationBossTileDebuffed } from "../game/bossTileDebuff.js";
import { triggerHaptic } from "../platform/haptics.js";
import { useFirstWordTutorialController } from "./controllers/useFirstWordTutorialController.js";
import { useWordSlotPresentation } from "./controllers/useWordSlotPresentation.js";
import { usePlayfieldController } from "./controllers/usePlayfieldController.js";
import { useGridDiscardController } from "./controllers/useGridDiscardController.js";
import { useSubmitWordController } from "./controllers/useSubmitWordController.js";
import { useSpellCastController } from "./controllers/useSpellCastController.js";
import { usePackPickController } from "./controllers/usePackPickController.js";
import { useRunSaveBridge } from "./controllers/useRunSaveBridge.js";
import { useRunEndFlowController } from "./controllers/useRunEndFlowController.js";
import { pickRandomInRunSpellId, IN_RUN_RANDOM_SPELL_EXCLUDE } from "../spells/spellInRunPool.js";

/** @param {{ ports: { core: import('./ports/createCorePorts.js').CorePort, playfield: import('./ports/createPlayfieldPorts.js').PlayfieldPort, shop: import('./ports/createShopPorts.js').ShopPort, treasures: import('./ports/createTreasurePorts.js').TreasuresPort, run: import('./ports/createRunPorts.js').RunPort, overlay: import('./ports/createOverlayPorts.js').OverlayPort, scoring: import('./ports/createScoringPorts.js').ScoringPort, uiFx: import('./ports/createUiFxPorts.js').UiFxPort }, openStageSettlement: (...args: unknown[]) => unknown, hooks?: import('./runSessionTypes.js').GamePanelSessionAssemblyHooks }} input */
export function useGamePanelSessionAssembly(input) {
  const { ports, openStageSettlement, hooks = {} } = input;
  const shop = ports.shop;
  const {
    applyUpgradeFromOffer,
    buildEclipseLengthUpgradeSteps,
    buildEclipseRarityUpgradeSteps,
    buildInRunLengthUpgradeStep,
    buildRollBundleOptionsCtx,
    buildRollInRunBundlePackCtx,
    buildShopOwnedPreviewNavItems,
    buildUpgradeAnimPayloadFromOffer,
    canPlaceTreasureOffer,
    ensurePackPickOverlayVisible,
    fulfillPackInnerPurchase,
    glyphShopSkipLevelAdvance,
    initShopViewContext,
    notifyShopLeave,
    onPackInnerClaim,
    onPackPickSkip,
    onShopNextLevel,
    onShopReorderOwned,
    onShopReroll,
    onShopSelectOffer,
    onShopSelectOwned,
    onShopSelectPackOffer,
    onShopUpgradeInteractionUnlock,
    openShopPackSession,
    packOffers,
    packPickBusy,
    packPickOptionKeyOf,
    packPickOverlaySuppressed,
    packPickRequiredPicks,
    packPickSession,
    packPickSkipBusy,
    playArrowUpShopUpgradeSequence,
    playEclipseLengthUpgradeSequence,
    playEclipseRarityUpgradeSequence,
    runInRunPackPickFlow,
    runInRunUpgradePlaybackSteps,
    runShopUpgradePlaybackSteps,
    shopInteractionsDisabled,
    shopOffers,
    shopOverlayLayersSuppressed,
    shopPanelRef,
    shopPhase,
    shopPortalStackStyle,
    shopPortalZ,
    shopRerollsThisVisit,
    shopSelectionBridge,
    shopSpellRuntimeBridge,
    shopVoucherBonusShelf,
    shopVoucherShelf,
    shopVoucherShelfGeneration,
    shouldRestorePackPickOverlayAfterSpellConfirm,
    showShop,
  } = shop;

  const playfield = ports.playfield;
  const {
    appendShopDeckEntries,
    appendShopDeckEntriesAndNotify,
    basketballWordsSubmitted,
    ceruleanBellSlotIndex,
    deck,
    deckBtnRef,
    deckCount,
    deckPreview,
    dictFatalError,
    dictionaryReady,
    ensureCeruleanBellMarkedOnGrid,
    ensureSlotRafRunning,
    exportDeckState,
    finalizeCeruleanBellSlotIndex,
    findCeruleanBellLockedTileOnGrid,
    flatGrid,
    flyingBackBatches,
    flyingLetters,
    getGridTileElByIndex,
    getInRunDeckFlyTargetEl,
    getSelectedGridCellElsInOrder,
    grid,
    gridIntroDone,
    gridRefillAnimating,
    gridTileRefs,
    hydrateDeckState,
    initialDeckSnapshot,
    insertSelectedTileAt,
    isManacleBossGrid,
    letterGridRef,
    letterGridWrapRef,
    markTileAsWildcard,
    refreshBossTileDebuffOnTile,
    refreshGridTileBaseScoresFromLevels,
    remainingRemovals,
    remainingWords,
    remapTileFromRawLetter,
    removeDeckCardByUid,
    removeDeckCardByUidAndNotify,
    removeDeckCardsForSubmittedWord,
    removeDeckCardsForSubmittedWordAndNotify,
    removeDeckLetterInstancesByRaws,
    removeDeckLettersByRawsWithTreasureNotify,
    removeFromSlot,
    removeSelectedLetters,
    removeSingleTileFromWord,
    reorderSelectedOrder,
    selectTile,
    selectedOrder,
    selectedTiles,
    snapshotGridCellsByTileId,
    submitBookmarkRef,
    submitBtnRef,
    suppressTilePrimaryClick,
    syncPlayerMarkBatchCounterFromGrid,
    touchGrid,
    updateSlotPositions,
    wordSelectionSwapBusy,
    wordSlotRefs,
    wordSlotsScaleRootRef,
    wordSlotsWrapRef,
  } = playfield;

  const treasures = ports.treasures;
  const {
    applyTreasureAcquireImmediateEffectsForRun,
    crimsonTreasureDisabledSlotIndex,
    displayOwnedTreasureKeys,
    displayOwnedTreasures,
    displayTreasureChargeProgressBySlot,
    displayTreasureChargeVisualBySlot,
    displayTreasureEffectDepletedBySlot,
    findFirstOwnedTreasureSlotIndex,
    findOwnedTreasureSlotIndex,
    findTreasurePlacementIndex,
    gameOwnedDragActive,
    gameOwnedDragChargeProgress,
    gameOwnedDragChargeState,
    gameOwnedDragEffectDepleted,
    gameOwnedDragGhostStyle,
    gameOwnedDragGhostVisible,
    gameOwnedDragPlaceholderStyle,
    gameOwnedDragPlaceholderVisible,
    gameOwnedDragSourceIndex,
    gameOwnedKeyOrderBag,
    gameTreasureCrimsonDisabledResolver,
    gameTreasureGemClassResolver,
    gameTreasureSlotClassResolver,
    grantOwnedTreasureAt,
    grantRandomShopTreasure,
    grantRandomShopTreasureByRarity,
    grantSpellBonusShopVoucher,
    hiddenTreasureBarCount,
    onGameEmptyTreasureSlotClick,
    onGameOwnedSlotPointerDown,
    ownedSlotTreasureIdList,
    ownedTreasureFilledCount,
    ownedTreasures,
    ownedUpgrades,
    ownedVoucherIds,
    pickCrimsonDisabledTreasureSlotIndex,
    pillarUsedDeckUids,
    playTreasureGrantPopAtSlotIndex,
    presentTreasureDetail,
    runDetachedTileShrinkReplacePop,
    runHourglassStageEndFx,
    runTreasureLevelCompleteHooks,
    runTreasurePackOpenPrecursor,
    treasureBarCompactAnimating,
    treasureBarExpandBtnHighlight,
    treasureBarStackMode,
    treasureChargeProgressBySlot,
    treasureChargeVisualBySlot,
    treasureDetail,
    treasureGemClass,
    treasureOriginRectFromEl,
    treasureRunState,
    treasureSession,
    treasureSlotsLayoutClass,
    verdantTreasureSold,
    waitForOwnedTreasureSlotEl,
    wordSlotPresentation: injectedWordSlotPresentation,
  } = treasures;

  const runPort = ports.run;
  const {
    achievementRunState,
    activeBossSlug,
    armBossDowngradeFxModel,
    armBossLengthDowngradeFxActive,
    beginFirstWordTutorialAfterGridSettled,
    bossRerollSession,
    bossSlugForMechanics,
    bossTapeSoftPreview,
    bossMechanicsSuppressed,
    bumpWordLengthLevel,
    clearPagerQuizPendingResolve,
    clearWinFxModel,
    clearWinLengthUpgradeFxActive,
    clubRequiredKeyBoss,
    currentLevel,
    currentScore,
    evaluateOxBossHit,
    getBossTileDebuffContext,
    infoModalNextLevelId,
    isAmberBossMaskActive,
    isCrimsonBossMechanicsActive,
    isEndlessRun,
    isFlintBossActive,
    judgedLengthTableLenForRun,
    lastReplayableSpellId,
    lastSubmitRarityFxActive,
    lastSubmitRarityFxModel,
    lengthLevelsByLength,
    lengthUpgradeObservatoryExtra,
    levelIndex,
    levelTitleBoxRef,
    levelTitleLabel,
    mergeCareerOnRunEnd,
    money,
    mouthLockedLengthBoss,
    noteCollectionAccessoryAcquired,
    noteCollectionDiscovery,
    noteCollectionMaterialAcquired,
    noteCollectionUpgradeForWordLen,
    noteCollectionUpgradeFromRandomPick,
    noteCollectionUpgradeUsed,
    noteCollectionWordSubmitted,
    noteDiscardExhaustedForChapterUnlock,
    notifyBossRestrictionTreasures,
    pagerQuizSession,
    pendingBossSlugOverride,
    pendingPagerQuizSession,
    playBossTapeTriggerCue,
    rarityLevelsByRarity,
    resetLevelAfterTreasurePrep,
    runDifficultyIndex,
    runDiscoveryLog,
    runEndCtrlSlot,
    runEndEnterEndlessImpl,
    runEndFlowHostRef,
    runEndOutcome,
    runEndPortalZ,
    runLifecycle,
    runMatchStats,
    runPendingInRunGrantsAfterSubmit,
    runPresetId,
    runRandom,
    runRng,
    runWalletFloor,
    runWordLengthJudgmentPenalty,
    setRarityLevelWithTreasurePairs,
    setRunWordLengthJudgmentPenalty,
    setWordLengthLevel,
    spellCastHistory,
    spellCountsByLength,
    recordSpellWordLength,
    targetScore,
    usedWordLengthsThisBoss,
    walletHeaderShown,
  } = runPort;

  const core = ports.core;
  const {
    COLS,
    ROWS,
    SHOW_SUBMIT_TRANSLATION,
    emit,
    firstWordTutorialCtrlSlot,
    getGamePanelAlive,
    mountGamePanelSessionNamespaces,
    overlayStackController,
    phaseStore,
    props,
    session,
  } = core;

  const overlay = ports.overlay;
  const {
    bossMechanicsCtrl,
    dismissTileDetailLayer,
    firstWordTutorialLayerRef,
    gamePanelPlayfieldRef,
    isFirstWordTutorialBlockingInput,
    isGamePaused,
    isRunFlowOverlayOpen,
    openInfoModal,
    openPauseOptions,
    openPauseOptionsFromShop,
    openRunEnd,
    openTileDetail,
    openWordDefinitionLayer,
    pendingSpellTileAppearanceAnim,
    runOverlayHostRef,
    runResultPresentationCtrl,
    setGameTreasureSlotRef,
    shopTransactionCtrl,
    showDeckLayer,
    showInfoLayer,
    showPauseOptions,
    showRunEnd,
    showSettlement,
    showToast,
    showTreasureCollectionLayer,
    showWordDefinitionTrigger,
    spellGrantDetailCloseHandler,
    spellReferencePreview,
    spellTargetSession,
    tileDetailCtrl,
    tileDetailPayload,
    tileDetailPreviewNav,
    tileOriginRectFromElement,
    transitionBusy,
    treasureInventoryCtrl,
    wordDefinitionCtrl,
    wordDefinitionExtraCount,
    wordDefinitionHiddenForWordLeave,
    wordDefinitionPreviewLine,
    wordDefinitionPreviewWord,
    wordDefinitionTriggerMode,
    wordDefinitionZoneVisible,
    wordTranslationInnerRef,
    wordTranslationWrapRef,
  } = overlay;

  const scoring = ports.scoring;
  const {
    animMultTotal,
    animResultTotal,
    animScoreSum,
    applyHookBossAfterSubmit,
    applySubmitRefill,
    buildEffectiveWordPartsForSubmit,
    buildSubmitAfterLettersContext,
    buildTileDetailPayloadFromDeckCard,
    buildTileDetailPayloadFromTile,
    buildWordSlotPreviewNav,
    buildWordSlotTileDetailPayload,
    canOpenTileDetail,
    canSubmit,
    deferredWordSubmitPayload: deferredWordSubmitPayloadBox,
    displayFormulaMult,
    displayFormulaScore,
    effectiveWordForSubmit,
    effectiveWordPartsForSubmit,
    flashSubmitCountDelta,
    flushAchievementUnlocks,
    flushDeferredWordSubmitRecord,
    flushSubmitAchievements,
    formatNum,
    getResultMultNumEl,
    getResultScoreNumEl,
    getResultTotalEl,
    getWordDefinition,
    headerRoundScoreValue,
    headerTargetScoreValue,
    hideResultWordLengthBeforeTotal,
    listEffectiveTilesForSubmit,
    resolveRealSubmitTileForWordSlot,
    resolveWordFromEffectiveParts,
    resolvedWordForSubmit,
    resultTotalShown,
    resultWordLengthLevel,
    resultWordLengthShown,
    rewardDollarMarks,
    roundScoreOverride,
    scheduleStaggeredTileRemoveHaptics,
    scoringAnimating,
    scoringLetterIndex,
    scoringTreasureBarIndex,
    setLastWordFromSubmit,
    settlementSnapshot,
    showResultTotalBar,
    showResultWordLength,
    stageRewardYuan,
    submitDeltaKey,
    submitTranslationLines,
    submitWordBusy,
    suppressResultWordLengthUntilScoringEnd,
  } = scoring;

  const uiFx = ports.uiFx;
  const {
    awaitWobbleScoreSlotTimeline,
    clearAllTreasureSlotWobbleFront,
    createWobbleScoreSlotTimeline,
    formatMoneyBubbleLabel,
    pulseFill,
    pulseFormulaMultMultiplyBurst,
    pulseFormulaPanelNum,
    scheduleMultMultiplyBubbleOutro,
    scheduleSmallPlusBubbleOutro,
    showMultMultiplyBubble,
    showScoreBubble,
    triggerAccessoryChipRipple,
    wobbleGameTreasureSlot,
    wobbleScoreSlot,
  } = uiFx;

  const bumpOverlayZ = overlayStackController.bumpOverlayZ;

  const {
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
  } = hooks;

  const gameOwnedDragTreasure = treasureSession.gameOwnedDragTreasure;
  const inRunGrantUpgradeFxActive = runResultPresentationCtrl.inRunGrantUpgradeFxActive;
  const onGameOwnedSlotClick = treasureInventoryCtrl.onOwnedSlotClick;
  const getOwnedTreasureSlotEl = (slotIndex) => treasureInventoryCtrl.getSlotElement(slotIndex);
  const getOwnedTreasureBarFxEl = (slotIndex) => treasureInventoryCtrl.getBarFxEl(slotIndex);
  const getBossTapeStrip = () => gamePanelPlayfieldRef.value?.bossTapeStripRef?.value ?? null;

const playfieldBridge = { ctrl: /** @type {import('./controllers/usePlayfieldController.js').PlayfieldController | null} */ (null) };

function getPlayfieldFlySnapshotFromBridge() {
  const ctrl = playfieldBridge.ctrl;
  if (ctrl) {
    return {
      flyingLetters: ctrl.flyingLetters.value,
      flyingBackBatches: ctrl.flyingBackBatches.value,
    };
  }
  return {
    flyingLetters: flyingLetters.value,
    flyingBackBatches: flyingBackBatches.value,
  };
}

function updateSlotPositionsViaBridge(...args) {
  playfieldBridge.ctrl?.updateSlotPositions?.(...args);
}

function resolveRealSubmitTileForScoring(slotIndex, scoringTile = null) {
  const order = selectedOrder.value;
  if (Array.isArray(order) && slotIndex >= 0 && slotIndex < order.length) {
    const pos = order[slotIndex];
    if (pos && typeof pos.row === "number" && typeof pos.col === "number") {
      const tile = grid.value[pos.row]?.[pos.col];
      if (tile && typeof tile === "object") return tile;
    }
  }
  const id = scoringTile?.id;
  if (id == null) return null;
  const g = grid.value;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const tile = g[r]?.[c];
      if (tile && tile.id === id) return tile;
    }
  }
  return null;
}

async function onPlayfieldCeruleanBellNewGridLock(marked) {
  if (marked) {
    playBossTapeTriggerCue();
    await notifyBossRestrictionTreasures("cerulean_bell");
    scheduleRunAutoSave();
  }
  await playfieldBridge.ctrl?.tryCeruleanBellFlyInAfterGridStable?.();
}

const firstWordTutorialCtrl = useFirstWordTutorialController({
  getSaveSlotIndex: () => props.saveSlotIndex,
  getFirstWordTutorialEnabled: () => props.firstWordTutorial,
  getRunDifficultyIndex: () => runDifficultyIndex.value,
  getLevelIndex: () => levelIndex.value,
  cols: COLS,
  getGrid: () => grid.value,
  touchGrid,
  cancelAllFlyingIn: () => playfieldBridge.ctrl?.cancelAllFlyingIn?.(),
  removeFromSlot,
  getSelectedOrderLength: () => selectedOrder.value.length,
  updateSlotPositions: updateSlotPositionsViaBridge,
  scoringAnimating,
  gridRefillAnimating,
  resolvedWordForSubmit,
  effectiveWordForSubmit,
  canSubmit,
  showShop,
  shopPortalZ,
  getShopOffers: () => shopOffers.value,
  bumpOverlayZ,
  getPlayfieldFlySnapshot: getPlayfieldFlySnapshotFromBridge,
  dom: {
    getPortalFrameEl: () => document.getElementById("game-view-portal-frame"),
    getDeckBtn: () => deckBtnRef.value,
    getGridTileElByIndex,
    getLetterGridWrap: () => letterGridWrapRef.value,
    getWordSlotsWrap: () => wordSlotsWrapRef.value,
    getSubmitBtn: () => submitBtnRef.value,
    getSubmitBookmark: () => submitBookmarkRef.value,
    getRunHeaderScoresRef: () => gamePanelPlayfieldRef.value?.runHeaderBarRef?.scoresHeaderRef,
    getShopTreasureOfferEl: () => shopPanelRef.value?.getFirstGuaranteedTreasureOfferEl?.(),
  },
  getLayerHost: () => firstWordTutorialLayerRef.value,
});

const firstWordTutorial = firstWordTutorialCtrl.tutorial;
const firstWordTutorialPhase = firstWordTutorialCtrl.phase;
const firstWordTutorialActive = firstWordTutorialCtrl.active;
const firstWordTutorialBlocking = firstWordTutorialCtrl.blocking;
const scheduleTutorialSpotlightUpdate = firstWordTutorialCtrl.scheduleSpotlightUpdate;
const maybeEndShopTutorialOnOfferOpen = firstWordTutorialCtrl.maybeEndShopTutorialOnOfferOpen;
const maybeEndShopTutorialOnTreasurePurchase = firstWordTutorialCtrl.maybeEndShopTutorialOnTreasurePurchase;
const onShopOpenedAfterEnter = firstWordTutorialCtrl.onShopOpenedAfterEnter;
const startFirstWordTutorialDevTest = firstWordTutorialCtrl.startDevTest;
const disposeFirstWordTutorial = firstWordTutorialCtrl.dispose;
const isShopTutorialBlockedShopInteraction = firstWordTutorialCtrl.isShopTutorialBlockedShopInteraction;
const firstWordTutorialGridGlow = firstWordTutorialCtrl.gridGlow;
const firstWordTutorialSubmitHighlightReady = firstWordTutorialCtrl.submitHighlightReady;
const firstWordTutorialTreasureDetailStackZFloor = firstWordTutorialCtrl.treasureDetailStackZFloor;

const wordSlotPresentation =
  injectedWordSlotPresentation ??
  useWordSlotPresentation({
  grid: {
    grid,
    selectedTiles,
    selectedOrder,
  },
  ownedSlotTreasureIds: ownedSlotTreasureIdList,
  rarityLevelsByRarity,
  resolvedWordForSubmit,
  effectiveWordForSubmit,
  effectiveWordPartsForSubmit,
  buildEffectiveWordPartsForSubmit,
  resolveWordFromEffectiveParts,
  listEffectiveTilesForSubmit,
  getPlayfieldFlySnapshot: getPlayfieldFlySnapshotFromBridge,
  bossSlugForMechanics,
  getBossTileDebuffContext,
});

const playfieldController = usePlayfieldController({
  grid: {
    grid,
    selectedOrder,
    selectedTiles,
    selectTile,
    removeFromSlot,
    removeSingleTileFromWord,
    insertSelectedTileAt,
    reorderSelectedOrder,
    ceruleanBellSlotIndex,
    finalizeCeruleanBellSlotIndex,
    touchGrid,
    ensureCeruleanBellMarkedOnGrid,
    findCeruleanBellLockedTileOnGrid,
    ROWS,
    COLS,
  },
  dom: {
    getLetterGridRef: () => letterGridRef.value,
    getLetterGridWrapRef: () => letterGridWrapRef.value,
    getWordSlotsWrapRef: () => wordSlotsWrapRef.value,
    getWordSlotsScaleRootRef: () => wordSlotsScaleRootRef.value,
  },
  gates: {
    transitionBusy,
    showShop,
    scoringAnimating,
    gridRefillAnimating,
    dictFatalError,
    suppressTilePrimaryClick,
    wordSelectionSwapBusy,
  },
  presentation: {
    getWordSlotTilePresentations: () => wordSlotPresentation.wordSlotTilePresentations.value,
    vowelGhostForTile: wordSlotPresentation.vowelGhostForTile,
    computeFlyInTilePresentation: wordSlotPresentation.computeFlyInTilePresentation,
    computeFlyBackTilePresentation: wordSlotPresentation.computeFlyBackTilePresentation,
    tilePresentationInResolvedWord: wordSlotPresentation.tilePresentationInResolvedWord,
    resolvedWordForSubmit: wordSlotPresentation.resolvedWordForSubmit,
    effectiveWordPartsForSubmit: wordSlotPresentation.effectiveWordPartsForSubmit,
    effectiveWordForSubmit: wordSlotPresentation.effectiveWordForSubmit,
    bossSlugForMechanics,
    getBossTileDebuffContext,
    resolvePresentationBossTileDebuffed,
    isTileInFlyingBackFromWord: wordSlotPresentation.isTileInFlyingBackFromWord,
  },
  ui: {
    isRunFlowOverlayOpen,
    isFirstWordTutorialBlockingInput,
    isGamePaused,
    bumpOverlayZ,
    triggerHaptic,
    showToast,
  },
  callbacks: {
    scheduleRunAutoSave,
    scheduleTutorialSpotlightUpdate,
    onCeruleanBellNewGridLock: onPlayfieldCeruleanBellNewGridLock,
  },
  render: {
    gridTileLetterForRender: wordSlotPresentation.gridTileLetterForRender,
    gridTileRarityForRender: wordSlotPresentation.gridTileRarityForRender,
    gridTileVowelGhostForRender: wordSlotPresentation.gridTileVowelGhostForRender,
  },
  firstWordTutorialActive,
  detail: {
    openTileDetail,
    buildTileDetailPayloadFromTile,
    buildWordSlotTileDetailPayload,
    buildWordSlotPreviewNav,
    canOpenTileDetail,
    tileOriginRectFromElement,
    armTileLongPressFromPointer: tileDetailCtrl.armTileLongPressFromPointer,
    clearTileLongPressArm: tileDetailCtrl.clearTileLongPressArm,
    markTilePrimaryTapConsumed: tileDetailCtrl.markTilePrimaryTapConsumed,
    armTilePrimaryTap: tileDetailCtrl.armTilePrimaryTap,
    tryCompleteTilePrimaryTap: tileDetailCtrl.tryCompleteTilePrimaryTap,
    onTilePointerCancel: tileDetailCtrl.onTilePointerCancel,
  },
  firstWordTutorial: {
    allowsTileClick: firstWordTutorial.allowsTileClick,
    onLetterSelected: firstWordTutorial.onLetterSelected,
    phase: firstWordTutorialPhase,
  },
});
playfieldBridge.ctrl = playfieldController;

const gridDropAnim = createGridDropAnim({
  getGrid: () => grid.value,
  getGridTileElByIndex,
  getGridTileRef: (index) => gridTileRefs.value[index],
  clearGridTileGsapAfterDrop: playfieldController.clearGridTileGsapAfterDrop,
  triggerHaptic,
  rows: ROWS,
  cols: COLS,
});

runLifecycle.bindGridDropAnim(gridDropAnim);
runLifecycle.bindPlayfield({
  gridIntroDone,
  gridRefillAnimating,
  gridTileRefs: playfieldController.gridTileRefs,
  updateSlotPositions: playfieldController.updateSlotPositions,
  syncPlayerMarkBatchCounterFromGrid,
  ensureSlotRafRunning: playfieldController.ensureSlotRafRunning,
  tryCeruleanBellFlyInAfterGridStable: playfieldController.tryCeruleanBellFlyInAfterGridStable,
  beginFirstWordTutorialAfterGridSettled,
  runHeaderBarRef: computed(() => gamePanelPlayfieldRef.value?.runHeaderBarRef ?? null),
});

const discardController = useGridDiscardController({
  grid: {
    selectedOrder,
    selectedTiles,
    removeSelectedLetters,
    remainingRemovals,
  },
  playfield: {
    flyingLetters: playfieldController.flyingLetters,
    flyingBackBatches: playfieldController.flyingBackBatches,
    cancelAllFlyingIn: playfieldController.cancelAllFlyingIn,
    wordSlotRefs: playfieldController.wordSlotRefs,
    getSelectedGridCellElsInOrder: playfieldController.getSelectedGridCellElsInOrder,
    clearGridTileGsapAfterDrop: playfieldController.clearGridTileGsapAfterDrop,
    updateSlotPositions: playfieldController.updateSlotPositions,
    snapshotGridCellsByTileId,
  },
  gridDropAnim,
  gates: {
    transitionBusy,
    showShop,
    scoringAnimating,
    gridRefillAnimating,
    dictFatalError,
  },
  run: {
    treasureRunState,
    runMatchStats,
    achievementRunState,
    money,
    ownedVoucherIds,
    spellCountsByLength,
    runRandom,
  },
  wordLeave: {
    wordDefinitionHiddenForWordLeave,
  },
  ui: {
    isRunFlowOverlayOpen,
    isFirstWordTutorialBlockingInput,
    triggerHaptic,
    showToast,
    scheduleStaggeredTileRemoveHaptics,
  },
  callbacks: {
    scheduleRunAutoSave,
    noteDiscardExhaustedForChapterUnlock,
    tryCeruleanBellFlyInAfterGridStable: playfieldController.tryCeruleanBellFlyInAfterGridStable,
    getWordDefinition,
    judgedLengthTableLenForRun,
    ownedSlotTreasureIdList,
    findOwnedTreasureSlotIndex,
    removeDeckCardByUidAndNotify,
    flushAchievementUnlocks,
    noteTreasureRunUpgradeUsed,
    noteCollectionUpgradeForWordLen,
    bumpWordLengthLevel,
    isLengthObservatoryBoosted,
    playOwnedTreasureMoneyFx,
    ownedTreasureHookFxBridge,
    playOwnedTreasureWobbleOnlyFx,
    buildInRunLengthUpgradeStep,
    runInRunUpgradePlaybackSteps,
  },
  submitFx: {
    playSubmitWordLetterRemoveAndRewardLeave,
    playTreasureSlotScoreBurstAtPeak,
    playTreasureSlotBubbleBurstAtPeak,
  },
  sleep,
});

const submitUpgradeFxRegistrarState = { current: null };

function buildSettlementSnapshotForSubmit() {
  return buildSettlementSnapshot({
    moneyBefore: money.value,
    clearReward: stageRewardYuan.value,
    remainingWords: remainingWords.value,
    remainingRemovals: remainingRemovals.value,
    rentalTreasureCount: countOwnedRentalTreasures(ownedTreasures.value),
    runPresetId: runPresetId.value,
    ownedVoucherIds: ownedVoucherIds.value,
    ownedSlotTreasureIds: ownedSlotTreasureIdList(),
  });
}

const submitController = useSubmitWordController({
  busy: {
    submitWordBusy,
    scoringAnimating,
  },
  scoringRefs: {
    scoringLetterIndex,
    scoringTreasureBarIndex,
    animScoreSum,
    animMultTotal,
    animResultTotal,
    roundScoreOverride,
    submitTranslationLines,
    hideResultWordLengthBeforeTotal,
    suppressResultWordLengthUntilScoringEnd,
    currentScore,
    targetScore,
    remainingWords,
    gridRefillAnimating,
    wordDefinitionHiddenForWordLeave,
    crimsonTreasureDisabledSlotIndex,
    lengthLevelsByLength,
    lengthUpgradeObservatoryExtra,
    rarityLevelsByRarity,
    isFlintBossActive,
    ownedVoucherIds,
    spellCountsByLength,
    armBossLengthDowngradeFxActive,
    shopOverlayLayersSuppressed,
    armBossDowngradeFxModel,
    lastSubmitRarityFxActive,
    lastSubmitRarityFxModel,
    clearWinFxModel,
    clearWinLengthUpgradeFxActive,
    ownedTreasures,
    treasureRunState,
    runWalletFloor,
    money,
    grid,
  },
  scoringFx: {
    pulseFill,
    pulseFormulaPanelNum,
    pulseFormulaMultMultiplyBurst,
    showScoreBubble,
    wobbleScoreSlot,
    createWobbleScoreSlotTimeline,
    awaitWobbleScoreSlotTimeline,
    triggerAccessoryChipRipple,
    showMultMultiplyBubble,
    scheduleSmallPlusBubbleOutro,
    scheduleMultMultiplyBubbleOutro,
    formatMoneyBubbleLabel,
    clearAllTreasureSlotWobbleFront,
  },
  scoringAnimCallbacks: {
    findFirstOwnedTreasureSlotIndex,
    touchGrid,
    wobbleGameTreasureSlot,
    bossSlugForMechanics,
    isBossTileDebuffed: (tile) => tile?.bossTileDebuffed === true,
    isBossDebuffedSubmitTile: (tile) => tile?.bossTileDebuffed === true,
    setWordLengthLevel,
    runLengthDowngradeShopLikeFx,
    noteCollectionUpgradeUsed,
    getUpgradeTreasureIdForRarityKey,
    setRarityLevelWithTreasurePairs,
    refreshGridTileBaseScoresFromLevels,
    runInGameRarityUpgradeShopLikeFx,
    isLengthObservatoryBoosted,
    noteTreasureRunUpgradeUsed,
    noteCollectionUpgradeForWordLen,
    bumpWordLengthLevel,
    runClearWinLengthUpgradeShopLikeFx,
    playBossTapeTriggerCue,
    notifyBossRestrictionTreasures,
    applyWalletDeltaClamped,
    parseTranslationLines,
    submitUpgradeFxRegistrarState,
    getWordDefinition,
    triggerHaptic,
    ownedSlotTreasureIdList,
    gridTileEntranceDelay: gridDropAnim.gridTileEntranceDelay,
    resolveRealSubmitTileForWordSlot:
      typeof resolveRealSubmitTileForWordSlot === "function"
        ? resolveRealSubmitTileForWordSlot
        : resolveRealSubmitTileForScoring,
    buildSubmitAfterLettersContext,
    flushDeferredWordSubmitRecord,
    notifySubmitAfterLettersBeforePostSteps,
    get deferredWordSubmitPayload() {
      return deferredWordSubmitPayloadBox.value;
    },
    setDeferredWordSubmitPayload(payload) {
      deferredWordSubmitPayloadBox.value = payload;
    },
    clearDeferredWordSubmitPayload() {
      deferredWordSubmitPayloadBox.value = null;
    },
    clearPagerQuizPendingResolve,
    runPendingInRunGrantsAfterSubmit,
    snapshotGridCellsByTileId,
    runSlotAndGridLeaveAnimation: discardController.runSlotAndGridLeaveAnimation,
    setLastWordFromSubmit,
    applySubmitRefill,
    applyHookBossAfterSubmit,
    tryCeruleanBellFlyInAfterGridStable: playfieldController.tryCeruleanBellFlyInAfterGridStable,
    updateSlotPositions: playfieldController.updateSlotPositions,
    scheduleRunAutoSave,
  },
  gridDropAnim,
  submitFx: {
    playSubmitWordLetterRemoveAndRewardLeave,
    playTreasureSlotScoreBurstAtPeak,
    playTreasureSlotBubbleBurstAtPeak,
    runSubmittedIceShatterEffects,
  },
  scoringAnimConstants: {
    SHOW_SUBMIT_TRANSLATION,
    ROWS,
    COLS,
  },
  phase: {
    transitionBusy,
    showShop,
    isRunFlowOverlayOpen,
  },
  dict: {
    dictFatalError,
    dictionaryReady,
  },
  grid: {
    grid,
    selectedTiles,
    selectedOrder,
    remainingRemovals,
    remainingWords,
    rarityLevelsByRarity,
    runWordLengthJudgmentPenalty,
    basketballWordsSubmitted,
    deckCount,
    lengthLevelsByLength,
    lengthUpgradeObservatoryExtra,
    currentScore,
    targetScore,
    ROWS,
    COLS,
    spellCountsByLength,
    initialDeckSnapshot,
    recordSpellWordLength,
  },
  run: {
    ownedTreasures,
    ownedVoucherIds,
    runPresetId,
    runRandom,
    treasureRunState,
    runMatchStats,
    levelIndex,
    isEndlessRun,
    money,
    initialDeckSnapshot,
  },
  boss: {
    usedWordLengthsThisBoss,
    mouthLockedLengthBoss,
    clubRequiredKeyBoss,
    crimsonTreasureDisabledSlotIndex,
    pillarUsedDeckUids,
    currentLevel,
    isFlintBossActive,
  },
  pager: {
    pendingPagerQuizSession,
    pagerQuizSession,
  },
  ui: {
    firstWordTutorialPhase,
    wordDefinitionHiddenForWordLeave,
    scoringLetterIndex,
    roundScoreOverride,
    submitTranslationLines,
  },
  dom: {
    getBossTapeStrip,
    getGameResultAreaRef: () => runResultPresentationCtrl.gameResultAreaRef,
    getWordTranslationWrap: () => wordTranslationWrapRef.value,
    getWordTranslationInner: () => wordTranslationInnerRef.value,
    getResultScoreNumEl,
    getResultMultNumEl,
    getResultTotalEl,
    getOwnedTreasureBarFxEl,
    getGridTileElByIndex,
    getSelectedGridCellElsInOrder: playfieldController.getSelectedGridCellElsInOrder,
    getWordSlotEl: (index) => playfieldController.wordSlotRefs[index] ?? null,
    getGridTileRefs: () => gridTileRefs.value,
    getWordSlotsWrapRef: () => wordSlotsWrapRef.value,
    getWordSlotsScaleRootRef: () => wordSlotsScaleRootRef.value,
    getWordSlotRefs: () => playfieldController.wordSlotRefs,
    getLetterGridRef: () => letterGridRef.value,
    getLetterGridWrapRef: () => letterGridWrapRef.value,
  },
  callbacks: {
    buildEffectiveWordPartsForSubmit,
    resolveWordFromEffectiveParts,
    listEffectiveTilesForSubmit,
    tilePresentationInResolvedWord: wordSlotPresentation.tilePresentationInResolvedWord,
    getBossTileDebuffContext,
    bossSlugForMechanics,
    showToast,
    triggerHaptic,
    ownedSlotTreasureIdList,
    pickCrimsonDisabledTreasureSlotIndex,
    notifyBossRestrictionTreasures,
    recordWordSubmit,
    maybeReportTapTapBestSingleWordScore,
    noteCollectionWordSubmitted,
    flushSubmitAchievements,
    setDeferredWordSubmitPayload(payload) {
      deferredWordSubmitPayloadBox.value = payload;
    },
    clearDeferredWordSubmitPayload() {
      deferredWordSubmitPayloadBox.value = null;
    },
    playBossTapeTriggerCue,
    evaluateOxBossHit,
    runHourglassStageEndFx,
    runTreasureLevelCompleteHooks,
    buildSettlementSnapshot: buildSettlementSnapshotForSubmit,
    openRunEnd,
    openStageSettlement,
    getWordDefinition,
    parseTranslationLines,
    setSettlementSnapshot(snapshot) {
      settlementSnapshot.value = snapshot;
    },
    clearPagerQuizPendingResolve,
  },
  sleep,
  gsapLib: gsap,
  firstWordTutorial,
  scheduleTutorialSpotlightUpdate,
  flashSubmitCountDelta,
});

const submitWord = submitController.submitWord;

playfieldController.initViewContext({
  ROWS,
  COLS,
  formatNum,
  levelTitleLabel,
  runDifficultyIndex,
  stageRewardYuan,
  rewardDollarMarks,
  walletHeaderShown,
  headerTargetScoreValue,
  headerRoundScoreValue,
  activeBossSlug,
  clubRequiredKeyBoss,
  mouthLockedLengthBoss,
  bossTapeSoftPreview,
  bossSoftWordViolationPreview: bossMechanicsCtrl.bossSoftWordViolationPreview,
  bossMechanicsSuppressed,
  showResultTotalBar,
  showResultWordLength,
  resultTotalShown,
  resultWordLengthShown,
  resultWordLengthLevel,
  displayFormulaScore,
  displayFormulaMult,
  clearWinLengthUpgradeFxActive,
  lastSubmitRarityFxActive,
  inRunGrantUpgradeFxActive,
  armBossLengthDowngradeFxActive,
  wordDefinitionZoneVisible,
  SHOW_SUBMIT_TRANSLATION,
  showWordDefinitionTrigger,
  wordDefinitionTriggerMode,
  wordDefinitionPreviewWord,
  wordDefinitionPreviewLine,
  wordDefinitionExtraCount,
  openWordDefinitionLayer,
  submitTranslationLines,
  displayOwnedTreasures,
  displayOwnedTreasureKeys,
  treasureSlotsLayoutClass,
  treasureBarStackMode,
  ownedTreasureFilledCount,
  treasureBarCompactAnimating,
  gameOwnedDragActive,
  gameOwnedDragGhostVisible,
  gameOwnedDragPlaceholderVisible,
  gameOwnedDragTreasure,
  gameOwnedDragGhostStyle,
  gameOwnedDragPlaceholderStyle,
  gameOwnedDragSourceIndex,
  treasureGemClass,
  gameOwnedDragChargeState,
  gameOwnedDragChargeProgress,
  gameOwnedDragEffectDepleted,
  isCrimsonBossMechanicsActive,
  crimsonTreasureDisabledSlotIndex,
  isAmberBossMaskActive,
  displayTreasureChargeVisualBySlot,
  displayTreasureChargeProgressBySlot,
  displayTreasureEffectDepletedBySlot,
  gameTreasureGemClassResolver,
  gameTreasureSlotClassResolver,
  gameTreasureCrimsonDisabledResolver,
  hiddenTreasureBarCount,
  treasureBarExpandBtnHighlight,
  onGameOwnedSlotPointerDown,
  onGameOwnedSlotClick,
  onGameEmptyTreasureSlotClick,
  setGameTreasureSlotRef,
  openTreasureCollectionLayer: () => {
    showTreasureCollectionLayer.value = true;
  },
  isRunFlowOverlayOpen,
  openInfoModalLevel: () => openInfoModal("level"),
  openInfoModalStage: () => openInfoModal("stage"),
  canPause: computed(() => phaseStore.canPause()),
  showShop,
  flatGrid,
  gridIntroDone,
  isManacleBossGrid,
  deckCount,
  submitWord: submitController.submitWord,
  openDeckLayer: () => {
    showDeckLayer.value = true;
  },
  remainingWords,
  submitDeltaKey,
  canRemove: discardController.canRemove,
  discardBtnOverLimit: discardController.discardBtnOverLimit,
  onDiscardBtnClick: discardController.onDiscardBtnClick,
  remainingRemovals,
  removalDeltaKey: discardController.removalDeltaKey,
  canSubmit,
  scoringAnimating,
  gridRefillAnimating,
  scoringLetterIndex,
  flyingLetters: playfieldController.flyingLetters,
  flyingBackBatches: playfieldController.flyingBackBatches,
  firstWordTutorialActive,
  firstWordTutorialGridGlow,
  firstWordTutorialSubmitHighlightReady,
  isFirstWordTutorialBlockingInput,
  openPauseOptions,
});

const spellCastController = useSpellCastController({
  state: {
    lastReplayableSpellId,
    spellCastHistory,
    spellTargetSession,
    pendingSpellTileAppearanceAnim,
  },
  gates: { shopOverlayLayersSuppressed },
  phase: { getShowShop: () => showShop.value },
  grid: {
    grid,
    deck,
    initialDeckSnapshot,
    ROWS,
    COLS,
    touchGrid,
    syncTileStateToDeckCard,
    refreshGridTileBaseScoresFromLevels,
    lengthLevelsByLength,
    rarityLevelsByRarity,
    spellCountsByLength,
    setWordLengthLevel,
    bumpWordLengthLevel,
    markTileAsWildcard,
    removeDeckLetterInstancesByRaws,
    removeDeckCardsForSubmittedWord,
    removeDeckCardByUid,
    appendShopDeckEntries,
    remapTileFromRawLetter,
    setRunWordLengthJudgmentPenalty,
  },
  run: {
    money,
    ownedTreasures,
    ownedVoucherIds,
    treasureRunState,
    runRandom,
    runPresetId,
  },
  treasureDetail,
  spellReferencePreview,
  dom: {
    getDeckBtn: () => deckBtnRef.value,
    getSpellTargetLayer: () => runOverlayHostRef.value?.spellTargetLayerRef ?? null,
    getTreasureDetailLayer: () => runOverlayHostRef.value?.treasureDetailLayerRef ?? null,
    getGridTileElByIndex,
  },
  shop: {
    runInRunUpgradePlaybackSteps,
    buildEclipseLengthUpgradeSteps,
    buildEclipseRarityUpgradeSteps,
    playArrowUpShopUpgradeSequence,
    playEclipseLengthUpgradeSequence,
    playEclipseRarityUpgradeSequence,
    isCouponDropSpellBlockedByBonusVoucher: () => shopPhase.isCouponDropSpellBlockedByBonusVoucher(),
    getShopPanel: () => shopPanelRef.value,
  },
  packPick: {
    ensurePackPickOverlayVisible,
    shouldRestorePackPickOverlayAfterSpellConfirm,
  },
  fx: {
    wobbleGameTreasureSlot,
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    formatMoneyBubbleLabel,
    bumpOverlayZ,
    createWobbleScoreSlotTimeline,
    awaitWobbleScoreSlotTimeline,
    waitForOwnedTreasureSlotEl,
    runDetachedTileShrinkReplacePop,
    playTreasureGrantPopAtSlotIndex,
  },
  callbacks: {
    ownedSlotTreasureIdList,
    setRarityLevelWithTreasurePairs,
    noteCollectionUpgradeFromRandomPick,
    noteCollectionMaterialAcquired,
    noteCollectionAccessoryAcquired,
    noteCollectionDiscovery,
    noteTreasureRunUpgradeUsed,
    removeDeckLettersByRawsWithTreasureNotify,
    removeDeckCardsForSubmittedWordAndNotify,
    removeDeckCardByUidAndNotify,
    appendShopDeckEntriesAndNotify,
    grantRandomShopTreasure,
    grantRandomShopTreasureByRarity,
    grantSpellBonusShopVoucher,
    refreshBossTileDebuffOnTile,
    buildTileDetailPayloadFromDeckCard,
    showToast,
    scheduleRunAutoSave,
  },
  sleep,
});

const spellSession = spellCastController;

const packPickController = usePackPickController({
  gates: { shopOverlayLayersSuppressed },
  getPackPickLayer: () => runOverlayHostRef.value?.packPickLayerRef ?? null,
  getTreasureDetailLayer: () => runOverlayHostRef.value?.treasureDetailLayerRef ?? null,
  treasureDetail,
  shop: {
    buildRollBundleOptionsCtx,
    buildRollInRunBundlePackCtx,
    buildUpgradeAnimPayloadFromOffer,
    applyUpgradeFromOffer,
    runShopUpgradePlaybackSteps,
    getShopDeckViewBtnEl: () => shopPanelRef.value?.getDeckViewBtnEl?.() ?? null,
  },
  grant: {
    runSpellPreviewChain: (...args) => spellCastController.runSpellPreviewChain(...args),
    runInRunUpgradePlaybackSteps,
    appendShopDeckEntriesAndNotify,
  },
  run: { ownedTreasures, treasureRunState, runRandom },
  callbacks: {
    ownedSlotTreasureIdList,
    dismissTreasureDetailOnBack: async () => {
      if (!treasureDetail.value) return;
      if (treasureDetail.value.spellGrantFlow === true) {
        onTreasureDetailClose();
        return;
      }
      const layer = runOverlayHostRef.value?.treasureDetailLayerRef;
      if (layer?.playClose) await layer.playClose();
      onTreasureDetailClose();
    },
    scheduleRunAutoSave,
    showToast,
    canPlaceTreasureOffer,
    findTreasurePlacementIndex,
    grantOwnedTreasureAt,
    applyTreasureAcquireImmediateEffectsForRun,
    waitForOwnedTreasureSlotEl,
    animateTreasureFrameFly,
    playTreasureGrantPopAtSlotIndex,
    getOwnedTreasureSlotEl,
    getInRunDeckFlyTargetEl,
    playOwnedTreasureMultDeltaFx,
    treasureOriginRectFromEl,
    runTreasurePackOpenPrecursor,
    findOwnedTreasureSlotIndex,
    pickRandomInRunSpellId: () => pickRandomInRunSpellId(runRandom, [...IN_RUN_RANDOM_SPELL_EXCLUDE]),
  },
});

const packPickSessionRef = packPickController.packPickSession;
const packPickBusyRef = packPickController.packPickBusy;
const packPickSkipBusyRef = packPickController.packPickSkipBusy;
const packPickOverlaySuppressedRef = packPickController.packPickOverlaySuppressed;
const packPickOptionKeyOfFn = packPickController.packPickOptionKeyOf;
const packPickRequiredPicksFn = packPickController.packPickRequiredPicks;
const runInRunPackPickFlowFn = packPickController.runInRunPackPickFlow;
const onPackPickSkipFn = packPickController.onPackPickSkip;
const onPackInnerClaimFn = packPickController.onPackInnerClaim;
const fulfillPackInnerPurchaseFn = packPickController.fulfillPackInnerPurchase;
const ensurePackPickOverlayVisibleFn = packPickController.ensurePackPickOverlayVisible;
const shouldRestorePackPickOverlayAfterSpellConfirmFn =
  packPickController.shouldRestorePackPickOverlayAfterSpellConfirm;
const openShopPackSessionFn = packPickController.openShopPackSession;

const sessionRunState = {
  runPresetId,
  runDifficultyIndex,
  ownedVoucherIds,
  runSeedNumeric: coerceRunSeedNumeric(props.restoredSave?.runSeedNumeric ?? props.runSeed),
  runRng,
  rng: runRandom,
  ownedTreasures,
  levelIndex,
  isEndlessRun,
  money,
  ownedUpgrades,
  achievementRunState,
  runMatchStats,
  treasureRunState,
};

const runSaveBridge = useRunSaveBridge({
  getSaveSlotIndex: () => props.saveSlotIndex,
  getRunSeedDisplay: () => props.runSeedDisplay,
  isAlive: getGamePanelAlive,
  run: sessionRunState,
  grid: { exportDeckState, hydrateDeckState },
  overlay: { showShop, showSettlement, showRunEnd },
  anim: {
    transitionBusy,
    scoringAnimating,
    gridRefillAnimating,
    flyingLetters: playfieldController.flyingLetters,
    flyingBackBatches: playfieldController.flyingBackBatches,
    submitWordBusy,
  },
  shop: {
    shopOffers,
    packOffers,
    shopVoucherShelf,
    shopVoucherBonusShelf,
    shopRerollsThisVisit,
    shopVoucherShelfGeneration,
    packPickSession: packPickSessionRef,
  },
  boss: {
    usedWordLengthsThisBoss,
    mouthLockedLengthBoss,
    clubRequiredKeyBoss,
    pillarUsedDeckUids,
    verdantTreasureSold,
    crimsonTreasureDisabledSlotIndex,
    pendingBossSlugOverride,
    bossRerollSession,
  },
  spell: { spellCastHistory, lastReplayableSpellId },
  misc: {
    glyphShopSkipLevelAdvance,
    settlementSnapshot,
    runDiscoveryLog,
    runEndOutcome,
  },
});

function scheduleRunAutoSave() {
  runSaveBridge.scheduleAutoSave();
}

const runEndCtrl = useRunEndFlowController({
  showRunEnd,
  runEndOutcome,
  runEndPortalZ,
  runMatchStats,
  runDiscoveryLog,
  runDifficultyIndex,
  getRunSeedDisplay: () => props.runSeedDisplay,
  getReachedLevelId: () => currentLevel.value?.id ?? "",
  onRetry: () => emit("request-restart", { prefillSeed: false }),
  onEnterEndless: () => runEndEnterEndlessImpl(),
  onSelectDiscovery: (payload) =>
    handleRunEndDiscoverySelectPreview({
      runDiscoveryLog: runDiscoveryLog.value,
      payload,
      presentTreasureDetail: (args) => {
        tileDetailPayload.value = null;
        tileDetailPreviewNav.value = null;
        presentTreasureDetail(args);
      },
      openTileDetail,
    }),
  getRunEndFlowHost: () => runEndFlowHostRef.value,
  flowDeps: {
    showRunEnd,
    runEndOutcome,
    runEndPortalZ,
    bumpOverlayZ,
    showDeckLayer,
    showShop,
    showSettlement,
    showPauseOptions,
    settlementSnapshot,
    isEndlessRun,
    levelIndex,
    runDifficultyIndex,
    runMatchStats,
    runPresetId,
    dismissTileDetailLayer,
    clearRunEndOverlays: () => {
      showInfoLayer.value = false;
      treasureDetail.value = null;
      tileDetailPayload.value = null;
      spellReferencePreview.value = null;
    },
    triggerHaptic,
    flushAchievementUnlocks,
    mergeCareerOnRunEnd,
    getRunDiscoveryLog: () => runDiscoveryLog.value,
    scheduleRunAutoSave,
    requestCloudSync,
    getSaveBridge: () => runSaveBridge,
    clearSlotRunProgress,
    saveSlotIndex: props.saveSlotIndex,
    emitExitToMenu: () => emit("exit-to-menu"),
    nextTick,
    getRunEndFlowHost: () => runEndFlowHostRef.value,
  },
});

initShopViewContext({
  walletHeaderShown,
  shopPortalStackStyle,
  shopInteractionsDisabled,
  ownedVoucherIds,
  ownedTreasures,
  treasureChargeVisualBySlot: displayTreasureChargeVisualBySlot,
  treasureChargeProgressBySlot: displayTreasureChargeProgressBySlot,
  treasureEffectDepletedBySlot: displayTreasureEffectDepletedBySlot,
  treasureSlotsLayoutClass,
  treasureBarCompactAnimating,
  treasureBarExpandBtnHighlight,
  tutorialActive: firstWordTutorialActive,
  firstWordTutorialPhase,
  shopTutorialIntroActive: computed(() => firstWordTutorialPhase.value === "shopIntro"),
  shopTutorialTargetTreasureId: firstWordTutorialCtrl.shopTargetTreasureId,
  runPresetId,
  treasureRunState,
  walletFloor: runWalletFloor,
  nextLevelId: infoModalNextLevelId,
  firstWordTutorialActive,
  shopOffers,
  packOffers,
  shopVoucherShelfResolved: shopPhase.shopVoucherShelfResolved,
  shopVoucherBonusShelf,
  shopNextRerollCostDisplay: shopPhase.shopNextRerollCostDisplay,
  shopCanReroll: shopPhase.shopCanReroll,
  openTreasureCollectionLayer: () => {
    showTreasureCollectionLayer.value = true;
  },
  openPauseOptionsFromShop,
  openDeckLayer: () => deckPreview.openDeckLayer(),
  openInfoModalLevel: () => openInfoModal("level"),
  openInfoModalStage: () => openInfoModal("stage"),
  onShopNextLevel,
  onShopReroll,
  onShopSelectOffer,
  onShopSelectPackOffer,
  onShopSelectOwned,
  onShopReorderOwned,
  onShopUpgradeInteractionUnlock,
});

provide(DECK_PREVIEW_KEY, deckPreview);

mountGamePanelSessionNamespaces({
  run: sessionRunState,
  save: runSaveBridge,
  playfield: playfieldController,
  submit: submitController,
  discard: discardController,
  shop: shopPhase,
  treasures: treasureSession,
  spell: spellCastController,
  packPick: packPickController,
  lifecycle: runLifecycle,
  overlayStack: overlayStackController,
  wordSlots: wordSlotPresentation,
  ui: {
    firstWordTutorial: firstWordTutorialCtrl,
    runEnd: runEndCtrl,
    wordDefinition: wordDefinitionCtrl,
    tileDetail: tileDetailCtrl,
    runResultPresentation: runResultPresentationCtrl,
    bossMechanics: bossMechanicsCtrl,
  },
});

shopSpellRuntimeBridge._ctx = () => spellCastController.buildSpellRuntimeContext();

  return {
    canSubmit,
    firstWordTutorialCtrl,
    firstWordTutorial,
    firstWordTutorialPhase,
    firstWordTutorialActive,
    firstWordTutorialBlocking,
    firstWordTutorialTreasureDetailStackZFloor,
    scheduleTutorialSpotlightUpdate,
    maybeEndShopTutorialOnOfferOpen,
    maybeEndShopTutorialOnTreasurePurchase,
    onShopOpenedAfterEnter,
    startFirstWordTutorialDevTest,
    disposeFirstWordTutorial,
    isShopTutorialBlockedShopInteraction,
    wordSlotPresentation,
    playfieldController,
    discardController,
    submitController,
    submitWord,
    spellCastController,
    spellSession,
    packPickController,
    sessionRunState,
    runSaveBridge,
    runEndCtrl,
    packPickSession: packPickSessionRef,
    packPickBusy: packPickBusyRef,
    packPickSkipBusy: packPickSkipBusyRef,
    packPickOverlaySuppressed: packPickOverlaySuppressedRef,
    packPickOptionKeyOf: packPickOptionKeyOfFn,
    packPickRequiredPicks: packPickRequiredPicksFn,
    runInRunPackPickFlow: runInRunPackPickFlowFn,
    onPackPickSkip: onPackPickSkipFn,
    onPackInnerClaim: onPackInnerClaimFn,
    fulfillPackInnerPurchase: fulfillPackInnerPurchaseFn,
    ensurePackPickOverlayVisible: ensurePackPickOverlayVisibleFn,
    shouldRestorePackPickOverlayAfterSpellConfirm: shouldRestorePackPickOverlayAfterSpellConfirmFn,
    openShopPackSession: openShopPackSessionFn,
  };
}
