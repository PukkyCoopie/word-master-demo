import { useGamePanelInfoModal } from "./controllers/useGamePanelInfoModal.js";
import { useRunHeaderPresentation } from "./controllers/useRunHeaderPresentation.js";
import { useRunAchievementBridge } from "./useRunAchievementBridge.js";
import { createGamePanelSubmitFxBridge } from "../game/gamePanelSubmitFxBridge.js";
import { useGamePanelRunFlowOverlayState } from "./controllers/useGamePanelRunFlowOverlayState.js";
import { useRunLifecycleController } from "./controllers/useRunLifecycleController.js";
import { useShopPhaseController } from "./controllers/useShopPhaseController.js";
import { useTreasureInventoryController } from "./controllers/useTreasureInventoryController.js";
import { useTreasureRunController } from "./controllers/useTreasureRunController.js";
import { useWordSlotPresentation } from "./controllers/useWordSlotPresentation.js";
import { useWordDefinitionController } from "./controllers/useWordDefinitionController.js";
import { useWordFavoriteController } from "./controllers/useWordFavoriteController.js";
import { useTileDetailController } from "./controllers/useTileDetailController.js";
import { usePauseOverlayController } from "./controllers/usePauseOverlayController.js";
import { useBossMechanicsController } from "./controllers/useBossMechanicsController.js";
import { ref } from "vue";
import { useRunResultPresentation } from "./controllers/useRunResultPresentation.js";
import { useDeckPreviewLayer } from "../composables/useDeckPreviewLayer.js";
import { pickRandomInRunSpellId, IN_RUN_RANDOM_SPELL_EXCLUDE } from "../spells/spellInRunPool.js";
import { buildSpellPoolExcludeIds } from "../spells/spellPoolEligibility.js";
import { buildTreasureRunShellHooks } from "./buildTreasureRunShellHooks.js";
import { wireGamePanelTreasureShop } from "./wireGamePanelTreasureShop.js";

/**
 * GamePanel controller 实例化（early：header / lifecycle / shop / treasure）。
 * @param {object} d
 */
function wireGamePanelControllersEarly(d) {
  const { showInfoLayer, infoModalInitialTab, openInfoModal } = useGamePanelInfoModal({
    isRunFlowOverlayOpen: d.isRunFlowOverlayOpen,
    firstWordTutorialActive: d.firstWordTutorialActive,
  });

  const runHeaderPresentation = useRunHeaderPresentation({
    levelIndex: d.levelIndex,
    runDifficultyIndex: d.runDifficultyIndex,
    showShop: d.showShop,
    getNextLevelDefAfterShop: () => d.getResolveNextLevelDefAfterShop()(),
    targetScore: d.targetScore,
    currentScore: d.currentScore,
    money: d.money,
  });

  const {
    currentLevel,
    infoModalNextLevelId,
    levelTitleLabel,
    stageRewardYuan,
    rewardDollarMarks,
    levelTitleBoxRef,
    walletHeaderShown,
    walletHeaderDisplayOverride,
    playWalletHeaderGainAnim,
    disposeSettlementWalletGainAnim,
    roundScoreOverride,
    debugScoreCardTargetOverride,
    debugScoreCardRoundOverride,
    headerTargetScoreValue,
    headerRoundScoreValue,
    disposeHeaderDomFx,
  } = runHeaderPresentation;

  const achievementBridge = useRunAchievementBridge({
    money: d.money,
    ownedVoucherIds: d.ownedVoucherIds,
    lengthLevelsByLength: d.lengthLevelsByLength,
    rarityLevelsByRarity: d.rarityLevelsByRarity,
    currentLevel,
    runMatchStats: d.runMatchStats,
    runDifficultyIndex: d.runDifficultyIndex,
    runDiscoveryLog: d.runDiscoveryLog,
    ownedTreasures: d.ownedTreasures,
    initialDeckSnapshot: d.initialDeckSnapshot,
    remainingRemovals: d.remainingRemovals,
    getTreasureRunState: () => d.treasureRunState.value,
    tryUnlockAchievements: d.tryUnlockAchievements,
  });

  /** @type {ReturnType<typeof useTreasureInventoryController>} */
  let treasureInventoryCtrl;

  const submitFxBridge = createGamePanelSubmitFxBridge({
    triggerHaptic: d.triggerHaptic,
    getTreasureSlotRoots: () => d.gameTreasureSlotRefs,
    getOwnedTreasureBarFxEl: (slotIndex) => treasureInventoryCtrl.getBarFxEl(slotIndex),
  });

  const runFlowOverlayState = useGamePanelRunFlowOverlayState({
    settlementLayerRef: d.settlementLayerRef,
  });

  const {
    shopPortalZ,
    settlementPortalZ,
    runEndPortalZ,
    shopPortalStackStyle,
    showRunEnd,
    runEndOutcome,
    showSettlement,
    disableSettlementLayerAnim,
    settlementSnapshot,
    settlementIntroPending,
    finishSettlementIntroInstant,
  } = runFlowOverlayState;

  const runLifecycle = useRunLifecycleController({
    phase: { transitionBusy: d.transitionBusy },
    run: {
      levelIndex: d.levelIndex,
      money: d.money,
      runPresetId: d.runPresetId,
      runDifficultyIndex: d.runDifficultyIndex,
      runSeedNumeric: d.getRunSeedNumeric(),
      isEndlessRun: d.isEndlessRun,
      ownedTreasures: d.ownedTreasures,
      ownedVoucherIds: d.ownedVoucherIds,
      runRandom: d.runRandom,
      treasureRunState: d.treasureRunState,
    },
    grid: {
      grid: d.grid,
      deck: d.deck,
      initialDeckSnapshot: d.initialDeckSnapshot,
      activeBossSlug: d.activeBossSlug,
      targetScore: d.targetScore,
      resetLevel: d.resetLevel,
      ROWS: d.ROWS,
      COLS: d.COLS,
    },
    bossPersist: {
      pillarUsedDeckUids: d.pillarUsedDeckUids,
      verdantTreasureSold: d.verdantTreasureSold,
    },
    bossApi: d.bossApiBridge,
    dev: {
      settlementSkipStressDevScenarioActive: d.settlementSkipStressDevScenarioActive,
      applySettlementSkipStressGridWord: d.applySettlementSkipStressGridWord,
      maskBubbleDevScenarioActive: d.maskBubbleDevScenarioActive,
      allIceDevScenarioActive: d.allIceDevScenarioActive,
      mouthQuProblemDevScenarioActive: d.mouthQuProblemDevScenarioActive,
      mouthTiaTeaDevScenarioActive: d.mouthTiaTeaDevScenarioActive,
      promoScreenshotDevPresetActive: d.promoScreenshotDevPresetActive,
      applyRandomBLettersToGrid: d.applyRandomBLettersToGrid,
      applyProblemQuRowToGrid: d.applyProblemQuRowToGrid,
      applyMouthTiaTeaRowToGrid: d.applyMouthTiaTeaRowToGrid,
      applyIceMaterialToAllGridTiles: d.applyIceMaterialToAllGridTiles,
      applyIceMaterialToAllDeckCards: d.applyIceMaterialToAllDeckCards,
      applyPromoGameplayGridMaterials: d.applyPromoGameplayGridMaterials,
      applyPromoGameplayTileBonuses: d.applyPromoGameplayTileBonuses,
    },
    dom: {
      getBossBlindRerollLayer: () => d.runOverlayHostRef.value?.bossBlindRerollLayerRef ?? null,
      getIrisTransition: () => d.irisTransition,
      wobbleGameTreasureSlot: (slotIndex) => submitFxBridge.wobbleGameTreasureSlot(slotIndex),
    },
    callbacks: {
      isShopNextLevelBlockedByTutorial: d.isFirstWordTutorialBlockingInput,
      scheduleRunAutoSave: d.scheduleRunAutoSave,
      showToast: d.showToast,
      noteRunMoneySpent: achievementBridge.noteRunMoneySpent,
      flushAchievementUnlocks: achievementBridge.flushAchievementUnlocks,
      recordPointerClientFromEvent: d.recordPointerClientFromEvent,
    },
  });

  d.assignResolveNextLevelDefAfterShop(runLifecycle.getNextLevelDefAfterShop);

  const shopPhase = useShopPhaseController({
    state: { showShop: d.showShop },
    gates: {
      transitionBusy: d.transitionBusy,
      shopOverlayLayersSuppressed: d.shopOverlayLayersSuppressed,
    },
    getShopPanel: () => d.shopPanelRef.value,
    waitNextTick: () => d.nextTick(),
    walletHeaderDisplayOverride,
    getDefaultWalletEl: () => d.shopPanelRef.value?.getWalletEl?.() ?? null,
    upgradeCallbacks: {
      getBuildSpellRuntimeContext: () => d.shopSpellRuntimeBridge.getBuildSpellRuntimeContext(),
      noteCollectionUpgradeFromRandomPick: achievementBridge.noteCollectionUpgradeFromRandomPick,
      noteCollectionAllLengthUpgrades: achievementBridge.noteCollectionAllLengthUpgrades,
      noteCollectionAllRarityUpgrades: achievementBridge.noteCollectionAllRarityUpgrades,
    },
    run: {
      money: d.money,
      ownedTreasures: d.ownedTreasures,
      ownedVoucherIds: d.ownedVoucherIds,
      ownedUpgrades: d.ownedUpgrades,
      treasureRunState: d.treasureRunState,
      runMatchStats: d.runMatchStats,
      runPresetId: d.runPresetId,
      runDifficultyIndex: d.runDifficultyIndex,
      isEndlessRun: d.isEndlessRun,
      runRandom: d.runRandom,
    },
    grid: {
      lengthLevelsByLength: d.lengthLevelsByLength,
      rarityLevelsByRarity: d.rarityLevelsByRarity,
      spellCountsByLength: d.spellCountsByLength,
    },
    spell: {
      lastReplayableSpellId: d.lastReplayableSpellId,
      spellCastHistory: d.spellCastHistory,
    },
    getCurrentLevelId: () => currentLevel.value?.id ?? "1-1",
    getNextLevelDefAfterShop: runLifecycle.getNextLevelDefAfterShop,
    buildTreasurePoolSnapshot: () => d.resolveBuildTreasurePoolSnapshot(),
    ownedSlotTreasureIdList: d.ownedSlotTreasureIdList,
    bumpWordLengthLevel: d.bumpWordLengthLevel,
    setRarityLevelWithTreasurePairs: d.setRarityLevelWithTreasurePairs,
    refreshGridTileBaseScoresFromLevels: d.refreshGridTileBaseScoresFromLevels,
    noteTreasureRunUpgradeUsed: d.noteTreasureRunUpgradeUsed,
    noteCollectionUpgradeUsed: achievementBridge.noteCollectionUpgradeUsed,
    noteRunMoneySpent: achievementBridge.noteRunMoneySpent,
    scheduleRunAutoSave: d.scheduleRunAutoSave,
    showToast: d.showToast,
    ownedTreasureHookFxBridge: d.ownedTreasureHookFxBridge,
    playOwnedTreasureMultDeltaFx: d.playOwnedTreasureMultDeltaFx,
    recordPrerequisiteTreasureShopAppeared: d.shopPrerequisiteBridge.record,
    readNormalizedSlotCareer: d.readNormalizedSlotCareer,
    selection: d.shopSelectionBridge,
  });

  runLifecycle.bindShop({
    showShop: d.showShop,
    showRunEnd,
    runWalletFloor: shopPhase.runWalletFloor,
    expireSpellBonusShopVoucherIfEnteringBoss: shopPhase.expireSpellBonusShopVoucherIfEnteringBoss,
  });

  treasureInventoryCtrl = useTreasureInventoryController({
    ownedTreasures: d.ownedTreasures,
    treasureRunState: d.treasureRunState,
    ownedTreasureIdSet: shopPhase.ownedTreasureIdSet,
    shopTreasurePool: shopPhase.shopTreasurePool,
    runRandom: d.runRandom,
    getShowShop: () => d.showShop.value,
    getShopPanel: () => d.shopPanelRef.value,
    getPlayfieldTreasureBar: () => d.gameTreasureBarRowRef.value,
    getPlayfieldSlotEl: (slotIndex) => d.gameTreasureSlotRefs[slotIndex] ?? null,
    showEmptyTreasureSlotHelp: d.showEmptyTreasureSlotHelp,
    isFirstWordTutorialActive: () => d.firstWordTutorialActive.value,
    scoringTreasureBarIndex: d.scoringTreasureBarIndex,
    isAmberBossMaskActive: () => d.bossMechanicsBridge.isAmberBossMaskActive(),
    playBossTapeTriggerCue: () => d.bossMechanicsBridge.playBossTapeTriggerCue(),
    isCrimsonTreasureSlotDisabled: (i) => d.bossMechanicsBridge.isCrimsonTreasureSlotDisabled(i),
    getGameOwnedDragMoved: () => d.gameOwnedDragMovedBridge.ref?.value ?? false,
    shopOverlayLayersSuppressed: d.shopOverlayLayersSuppressed,
  });

  const treasureBossNotifySlot = { fn: async (_slug) => {} };

  /** @type {{ treasureRunSelf: ReturnType<typeof useTreasureRunController> | null }} */
  const treasureRunHookApi = {
    treasureInventoryCtrl,
    treasureBossNotifySlot,
    shopPhase,
    treasureRunSelf: null,
  };

  const treasureRunHooks = buildTreasureRunShellHooks({
    ...d.treasureRunHookExtras,
    showScoreBubble: submitFxBridge.showScoreBubble,
    scheduleSmallPlusBubbleOutro: submitFxBridge.scheduleSmallPlusBubbleOutro,
    awaitTreasureSlotWobbleElForSubmit: (el, sp) => submitFxBridge.awaitSlotWobbleEl(el, sp),
    scheduleAfterGridTilesSettled: runLifecycle.scheduleAfterGridTilesSettled,
    buildLevelResetRunOpts: runLifecycle.buildLevelResetRunOpts,
    clearPendingAfterGridTilesSettled: runLifecycle.clearPendingAfterGridTilesSettled,
    triggerTreasureBarCompactAnim: () => treasureInventoryCtrl.triggerCompactAnim(),
    notifyBossRestrictionTreasures: (slug) => treasureBossNotifySlot.fn(slug),
    clearOwnedTreasureSlotById: (...args) => treasureRunHookApi.treasureRunSelf?.clearOwnedTreasureSlotById(...args),
    clearOwnedTreasureSlotLeaveGapById: (...args) =>
      treasureRunHookApi.treasureRunSelf?.clearOwnedTreasureSlotLeaveGapById(...args),
    buildRollInRunBundlePackCtx: shopPhase.buildRollInRunBundlePackCtx,
    buildUpgradeAnimPayloadFromOffer: shopPhase.buildUpgradeAnimPayloadFromOffer,
    applyUpgradeFromOffer: shopPhase.applyUpgradeFromOffer,
    rollRandomBigramForTreasure: (...args) => treasureRunHookApi.treasureRunSelf?.rollRandomBigramForTreasure(...args),
    findOwnedTreasureSlotIndex: (tid) =>
      treasureRunHookApi.treasureRunSelf?.findOwnedTreasureSlotIndex(tid) ?? -1,
    pickRandomInRunSpellIdForRun: () =>
      pickRandomInRunSpellId(d.runRandom, [
        ...IN_RUN_RANDOM_SPELL_EXCLUDE,
        ...shopPhase.spellPoolExcludeIdsWhenBonusVoucherActive(),
        ...buildSpellPoolExcludeIds(shopPhase.buildSpellPoolEligibilityCountsForRun()),
      ]),
    wobbleGameTreasureSlot: (slotIndex) => submitFxBridge.wobbleGameTreasureSlot(slotIndex),
  });

  const treasureRun = useTreasureRunController({
    run: {
      ownedTreasures: d.ownedTreasures,
      treasureRunState: d.treasureRunState,
      ownedVoucherIds: d.ownedVoucherIds,
      runPresetId: d.runPresetId,
      money: d.money,
      runRandom: d.runRandom,
      isEndlessRun: d.isEndlessRun,
    },
    grid: {
      basketballWordsSubmitted: d.basketballWordsSubmitted,
      currentScore: d.currentScore,
      targetScore: d.targetScore,
      deckCount: d.deckCount,
      initialDeckSnapshot: d.initialDeckSnapshot,
      deck: d.deck,
      bumpBasketballWordSubmitted: d.bumpBasketballWordSubmitted,
      appendShopDeckEntries: d.appendShopDeckEntries,
      appendDeckCardSpecToInitialSnapshot: d.appendDeckCardSpecToInitialSnapshot,
      removeDeckLetterInstancesByRaws: d.removeDeckLetterInstancesByRaws,
    },
    phase: {
      transitionBusy: d.transitionBusy,
      getShowShop: () => d.showShop.value,
      isRunFlowOverlayOpen: d.isRunFlowOverlayOpen,
    },
    reorderDom: {
      getSlotElement: (i) => d.gameTreasureSlotRefs[i] ?? null,
      getOverlayContainer: () =>
        d.gameTreasureBarRowRef.value?.getContainerEl?.() ?? d.gameTreasureSlotsCtnRef.value,
      getStackMode: () => treasureInventoryCtrl.stackMode.value,
    },
    collection: {
      noteCollectionTreasureAcquired: achievementBridge.noteCollectionTreasureAcquired,
      noteCollectionTreasureSlotAccessories: achievementBridge.noteCollectionTreasureSlotAccessories,
      noteCollectionDeckEntryModifiers: achievementBridge.noteCollectionDeckEntryModifiers,
      flushDeckMultisetAchievements: achievementBridge.flushDeckMultisetAchievements,
    },
    scheduleRunAutoSave: d.scheduleRunAutoSave,
    triggerHaptic: d.triggerHaptic,
    sharedTreasureDetail: d.treasureDetail,
    hooks: treasureRunHooks,
  });

  runLifecycle.bindTreasures({
    resetLevelAfterTreasurePrep: treasureRun.resetLevelAfterTreasurePrep,
    notifyShopLeave: treasureRun.notifyShopLeave,
    notifyBossRestrictionTreasures: treasureRun.notifyBossRestrictionTreasures,
    findOwnedTreasureSlotIndex: treasureRun.findOwnedTreasureSlotIndex,
  });

  treasureRunHookApi.treasureRunSelf = treasureRun;

  const shopTransactionCtrl = wireGamePanelTreasureShop({
    treasureInventoryCtrl,
    treasureRun,
    gameOwnedDragMovedBridge: d.gameOwnedDragMovedBridge,
    shopPhase,
    treasureDetail: d.treasureDetail,
    money: d.money,
    ownedTreasures: d.ownedTreasures,
    ownedVoucherIds: d.ownedVoucherIds,
    treasureRunState: d.treasureRunState,
    ownedSlotTreasureIdList: d.ownedSlotTreasureIdList,
    canPurchaseSpellInShop: d.canPurchaseSpellInShop,
    noteRunMoneySpent: achievementBridge.noteRunMoneySpent,
    noteRunShopPurchase: d.noteRunShopPurchase,
    noteCollectionVoucherAcquired: achievementBridge.noteCollectionVoucherAcquired,
    scheduleRunAutoSave: d.scheduleRunAutoSave,
    applyGlyphVoucherLevelSkip: runLifecycle.applyGlyphVoucherLevelSkip,
    ownedTreasureHookFxBridge: d.ownedTreasureHookFxBridge,
    onVerdantTreasureSold: () => d.bossMechanicsBridge.onVerdantTreasureSold(),
    onBossKeySold: () => d.bossMechanicsBridge.onBossKeySold(),
    getRunOverlayHost: () => d.runOverlayHostRef.value,
    getShopPanel: () => d.shopPanelRef.value,
  });

  d.buildTreasurePoolSnapshotBridge.run = treasureRun.buildTreasurePoolSnapshot;

  const notifyBossRestrictionTreasures = treasureRun.notifyBossRestrictionTreasures;
  d.assignBossRestrictionTreasureCueDispatch(() => {
    void notifyBossRestrictionTreasures();
  });
  treasureBossNotifySlot.fn = notifyBossRestrictionTreasures;

  return {
    showInfoLayer,
    infoModalInitialTab,
    openInfoModal,
    runHeaderPresentation,
    currentLevel,
    infoModalNextLevelId,
    levelTitleLabel,
    stageRewardYuan,
    rewardDollarMarks,
    levelTitleBoxRef,
    walletHeaderShown,
    playWalletHeaderGainAnim,
    disposeSettlementWalletGainAnim,
    roundScoreOverride,
    debugScoreCardTargetOverride,
    debugScoreCardRoundOverride,
    headerTargetScoreValue,
    headerRoundScoreValue,
    disposeHeaderDomFx,
    ...achievementBridge,
    submitFxBridge,
    ...submitFxBridge,
    runFlowOverlayState,
    shopPortalZ,
    settlementPortalZ,
    runEndPortalZ,
    shopPortalStackStyle,
    showRunEnd,
    runEndOutcome,
    showSettlement,
    disableSettlementLayerAnim,
    settlementSnapshot,
    settlementIntroPending,
    finishSettlementIntroInstant,
    runLifecycle,
    glyphShopSkipLevelAdvance: runLifecycle.glyphShopSkipLevelAdvance,
    usedWordLengthsThisBoss: runLifecycle.usedWordLengthsThisBoss,
    mouthLockedLengthBoss: runLifecycle.mouthLockedLengthBoss,
    clubRequiredKeyBoss: runLifecycle.clubRequiredKeyBoss,
    bossRerollSession: runLifecycle.bossRerollSession,
    pagerQuizSession: runLifecycle.pagerQuizSession,
    pendingPagerQuizSession: runLifecycle.pendingPagerQuizSession,
    pendingBossSlugOverride: runLifecycle.pendingBossSlugOverride,
    getNextLevelDefAfterShop: runLifecycle.getNextLevelDefAfterShop,
    buildLevelResetRunOpts: runLifecycle.buildLevelResetRunOpts,
    scheduleAfterGridTilesSettled: runLifecycle.scheduleAfterGridTilesSettled,
    runPendingAfterGridTilesSettled: runLifecycle.runPendingAfterGridTilesSettled,
    clearPendingAfterGridTilesSettled: runLifecycle.clearPendingAfterGridTilesSettled,
    syncEndlessLeaderboardChapterBaseline: runLifecycle.syncEndlessLeaderboardChapterBaseline,
    resetTapTapLeaderboardRunTracking: runLifecycle.resetTapTapLeaderboardRunTracking,
    runPagerQuizRequest: runLifecycle.runPagerQuizRequest,
    clearPagerQuizPendingResolve: runLifecycle.clearPagerQuizPendingResolve,
    runGridIntroAfterReset: runLifecycle.runGridIntroAfterReset,
    playLevelAdvanceHeaderFx: runLifecycle.playLevelAdvanceHeaderFx,
    onShopNextLevel: runLifecycle.onShopNextLevel,
    dismissBossRerollOnBack: runLifecycle.dismissBossRerollOnBack,
    applyGlyphVoucherLevelSkip: runLifecycle.applyGlyphVoucherLevelSkip,
    shopPhase,
    treasureInventoryCtrl,
    treasureRun,
    shopTransactionCtrl,
    treasureBossNotifySlot,
    notifyBossRestrictionTreasures,
    ownedSlotTreasureIdListFromController: treasureRun.ownedSlotTreasureIdList,
    findOwnedTreasureSlotIndex: treasureRun.findOwnedTreasureSlotIndex,
    findAllOwnedTreasureSlotIndices: treasureRun.findAllOwnedTreasureSlotIndices,
    grantOwnedTreasureAt: treasureRun.grantOwnedTreasureAt,
    applyTreasureAcquireImmediateEffectsForRun: treasureRun.applyTreasureAcquireImmediateEffectsForRun,
    canPlaceTreasureOffer: treasureRun.canPlaceTreasureOffer,
    findTreasurePlacementIndex: treasureRun.findTreasurePlacementIndex,
    syncOwnedTreasureSlots: treasureRun.syncOwnedTreasureSlots,
    gameOwnedKeyOrderBag: treasureRun.gameOwnedKeyOrderBag,
    gameOwnedDragActive: treasureRun.gameOwnedDragActive,
    gameOwnedDragGhostVisible: treasureRun.gameOwnedDragGhostVisible,
    gameOwnedDragPlaceholderVisible: treasureRun.gameOwnedDragPlaceholderVisible,
    gameOwnedDragSourceIndex: treasureRun.gameOwnedDragSourceIndex,
    gameOwnedDragMoved: treasureRun.gameOwnedDragMoved,
    gameOwnedDragGhostStyle: treasureRun.gameOwnedDragGhostStyle,
    gameOwnedDragPlaceholderStyle: treasureRun.gameOwnedDragPlaceholderStyle,
    displayOwnedTreasures: treasureRun.displayOwnedTreasures,
    displayOwnedTreasureKeys: treasureRun.displayOwnedTreasureKeys,
    onGameOwnedSlotPointerDown: treasureRun.onGameOwnedSlotPointerDown,
    presentTreasureDetail: treasureRun.presentTreasureDetail,
    buildShopOwnedPreviewNavItems: treasureRun.buildShopOwnedPreviewNavItems,
    treasureChargeVisualBySlot: treasureRun.treasureChargeVisualBySlot,
    treasureChargeProgressBySlot: treasureRun.treasureChargeProgressBySlot,
    displayTreasureChargeVisualBySlot: treasureRun.displayTreasureChargeVisualBySlot,
    displayTreasureChargeProgressBySlot: treasureRun.displayTreasureChargeProgressBySlot,
    treasureEffectDepletedBySlot: treasureRun.treasureEffectDepletedBySlot,
    displayTreasureEffectDepletedBySlot: treasureRun.displayTreasureEffectDepletedBySlot,
    gameOwnedDragChargeState: treasureRun.gameOwnedDragChargeState,
    gameOwnedDragChargeProgress: treasureRun.gameOwnedDragChargeProgress,
    gameOwnedDragEffectDepleted: treasureRun.gameOwnedDragEffectDepleted,
    buildTreasurePoolSnapshot: treasureRun.buildTreasurePoolSnapshot,
    runPendingInRunGrantsAfterSubmit: treasureRun.runPendingInRunGrantsAfterSubmit,
    resetLevelAfterTreasurePrep: treasureRun.resetLevelAfterTreasurePrep,
    runTreasureLevelCompleteHooks: treasureRun.runTreasureLevelCompleteHooks,
    runLevelEndPreSettlementFx: treasureRun.runLevelEndPreSettlementFx,
    notifyTreasureDeckCardsRemovedByRaws: treasureRun.notifyTreasureDeckCardsRemovedByRaws,
    appendShopDeckEntriesAndNotify: treasureRun.appendShopDeckEntriesAndNotify,
    appendDeckCardSpecToInitialSnapshotAndNotify: treasureRun.appendDeckCardSpecToInitialSnapshotAndNotify,
    removeAndCompactOwnedTreasureAtIndex: treasureRun.removeAndCompactOwnedTreasureAtIndex,
    removeOwnedTreasureSlotsLeaveGapAtIndices: treasureRun.removeOwnedTreasureSlotsLeaveGapAtIndices,
    clearOwnedTreasureSlotLeaveGapAtIndex: treasureRun.clearOwnedTreasureSlotLeaveGapAtIndex,
    notifyShopLeave: treasureRun.notifyShopLeave,
    rollRandomBigramForTreasure: treasureRun.rollRandomBigramForTreasure,
    treasureSession: treasureRun,
  };
}

/**
 * GamePanel controller 实例化（late：词槽 / 释义 / 详情 / 暂停 / Boss / 字母库预览 / 结算区）。
 * @param {object} d
 */
function wireGamePanelControllersLate(d) {
  const gpWordSlotPresentation = useWordSlotPresentation({
    grid: { grid: d.grid, selectedTiles: d.selectedTiles, selectedOrder: d.selectedOrder },
    ownedSlotTreasureIds: d.ownedSlotTreasureIdList,
    rarityLevelsByRarity: d.rarityLevelsByRarity,
    resolvedWordForSubmit: d.resolvedWordForSubmit,
    effectiveWordForSubmit: d.effectiveWordForSubmit,
    effectiveWordPartsForSubmit: d.effectiveWordPartsForSubmit,
    buildEffectiveWordPartsForSubmit: d.buildEffectiveWordPartsForSubmit,
    resolveWordFromEffectiveParts: d.resolveWordFromEffectiveParts,
    listEffectiveTilesForSubmit: d.listEffectiveTilesForSubmit,
    getPlayfieldFlySnapshot: d.getPlayfieldFlySnapshot,
    bossSlugForMechanics: d.bossSlugForMechanics,
    getBossTileDebuffContext: d.getBossTileDebuffContext,
  });

  const wordDefinitionCtrl = useWordDefinitionController({
    firstWordTutorialActive: d.firstWordTutorialActive,
    getFirstWordTutorialPhase: () => d.firstWordTutorialCtrlSlot?.ctrl?.phase?.value ?? null,
    getSaveSlotIndex: d.getSaveSlotIndex,
    dictionaryReady: d.dictionaryReady,
    resolvedWordForSubmit: d.resolvedWordForSubmit,
    effectiveWordForSubmit: d.effectiveWordForSubmit,
    getOwnedSlotTreasureIds: d.ownedSlotTreasureIdList,
    ownedTreasureHookFxBridge: d.ownedTreasureHookFxBridge,
    getWordDefinition: d.getWordDefinition,
    triggerHaptic: d.triggerHaptic,
  });

  const wordFavoriteCtrl = useWordFavoriteController({
    getSaveSlotIndex: d.getSaveSlotIndex,
    resolvedWordForSubmit: d.resolvedWordForSubmit,
    showWordDefinitionTrigger: wordDefinitionCtrl.showWordDefinitionTrigger,
    wordDefinitionTriggerMode: wordDefinitionCtrl.wordDefinitionTriggerMode,
    wordDefinitionPreviewLine: wordDefinitionCtrl.wordDefinitionPreviewLine,
    getDefinitionLines: () => wordDefinitionCtrl.wordDefinitionPreviewLines.value,
  });

  const tileDetailCtrl = useTileDetailController({
    dictFatalError: d.dictFatalError,
    transitionBusy: d.transitionBusy,
    scoringAnimating: d.scoringAnimating,
    gridRefillAnimating: d.gridRefillAnimating,
    isRunFlowOverlayOpen: d.isRunFlowOverlayOpen,
    triggerHaptic: d.triggerHaptic,
    refToDom: d.refToDom,
    getTileDetailLayer: () => d.runOverlayHostRef.value?.tileDetailLayerRef ?? null,
    onOpenRunEndTileDetail: () => {
      d.treasureDetail.value = null;
    },
    getDeckPreview: () => d.deckPreviewBridge.current,
    payloadCtx: {
      gridTileLetterForRender: gpWordSlotPresentation.gridTileLetterForRender,
      gridTileRarityForRender: gpWordSlotPresentation.gridTileRarityForRender,
      resolveWildcardInWordPresentation: gpWordSlotPresentation.resolveWildcardInWordPresentation,
      bossSlugForMechanics: d.bossSlugForMechanics,
      getBossTileDebuffContext: d.getBossTileDebuffContext,
      deckCardRaw: d.deckCardRaw,
      resolveLetterFromRaw: d.resolveLetterFromRaw,
      getRarityForLetter: d.getRarityForLetter,
      getSelectedOrder: () => d.selectedOrder.value,
      getGrid: () => d.grid.value,
      getWordSlotPresentations: () => gpWordSlotPresentation.wordSlotTilePresentations.value,
    },
  });

  const pauseOverlay = usePauseOverlayController({
    transitionBusy: d.transitionBusy,
    showShop: d.showShop,
    showInfoLayer: d.showInfoLayer,
    treasureDetail: d.treasureDetail,
    tileDetailPayload: tileDetailCtrl.tileDetailPayload,
    closeDeckLayer: () => d.deckPreviewBridge.current?.closeDeckLayer?.(),
    isBlockingPauseOpen: d.isBlockingPauseOpen,
    isFirstWordTutorialBlockingInput: d.isFirstWordTutorialBlockingInput,
    openPauseOptionsPortal: () => d.openPauseOptionsPortal(),
    bumpOverlayZ: d.bumpOverlayZ,
    getShopPortalZ: () => d.shopPortalZ?.value ?? 0,
    requestNewRun: () => d.requestNewRun?.(),
    openSettings: () => d.openSettings?.(),
    beforeMainMenuExit: () => {
      d.runAutoSave.flushRunSaveNow?.();
      d.abandonStandardWinRunProgressIfNeeded();
    },
    emitExitToMenu: () => d.emitExitToMenu(),
    openRunEnd: d.openRunEnd,
  });

  const pauseOverlaySession = {
    showPauseOptions: pauseOverlay.showPauseOptions,
    showDeveloperOptions: pauseOverlay.showDeveloperOptions,
    developerOptionsLayerRef: pauseOverlay.developerOptionsLayerRef,
    developerOptionsPortalStackStyle: pauseOverlay.developerOptionsPortalStackStyle,
    developerTreasureItems: d.devTreasurePickerItems,
    developerSpellItems: d.devSpellPickerItems,
    developerCurrentBalance: d.walletHeaderShown,
    openPauseOptions: pauseOverlay.openPauseOptions,
    openPauseOptionsFromShop: pauseOverlay.openPauseOptionsFromShop,
    closePauseOptions: pauseOverlay.closePauseOptions,
    closeDeveloperOptions: pauseOverlay.closeDeveloperOptions,
    onPauseDeveloperOptions: pauseOverlay.onPauseDeveloperOptions,
    onDeveloperOptionsClose: pauseOverlay.onDeveloperOptionsClose,
    onPauseContinue: pauseOverlay.onPauseContinue,
    onPauseNewRun: pauseOverlay.onPauseNewRun,
    onPauseSettings: pauseOverlay.onPauseSettings,
    onPauseMainMenu: pauseOverlay.onPauseMainMenu,
    onPauseEndGame: pauseOverlay.onPauseEndGame,
  };

  const bossMechanicsCtrl = useBossMechanicsController({
    pillarUsedDeckUids: d.pillarUsedDeckUids,
    verdantTreasureSold: d.verdantTreasureSold,
    suppressed: d.bossMechanicsSuppressed,
    activeBossSlug: d.activeBossSlug,
    getOwnedTreasures: () => d.ownedTreasures.value,
    getOwnedSlotTreasureIds: d.ownedSlotTreasureIdList,
    getTreasureRunState: () => d.treasureRunState.value,
    grid: d.grid,
    ROWS: d.ROWS,
    COLS: d.COLS,
    touchGrid: d.touchGrid,
    runRandom: d.runRandom,
    scoringAnimating: d.scoringAnimating,
    dictionaryReady: d.dictionaryReady,
    resolvedWordForSubmit: d.resolvedWordForSubmit,
    effectiveWordForSubmit: d.effectiveWordForSubmit,
    effectiveFormulaTiles: gpWordSlotPresentation.effectiveFormulaTiles,
    usedWordLengthsThisBoss: d.usedWordLengthsThisBoss,
    mouthLockedLengthBoss: d.mouthLockedLengthBoss,
    clubRequiredKeyBoss: d.clubRequiredKeyBoss,
    getWordLetterCount: d.getWordLetterCount,
    judgedLengthTableLenForRun: d.judgedLengthTableLenForRun,
    getWordDefinition: d.getWordDefinition,
    listEffectiveTilesForSubmit: d.listEffectiveTilesForSubmit,
    crimsonTreasureDisabledSlotIndex: d.crimsonTreasureDisabledSlotIndex,
    spellCountsByLength: d.spellCountsByLength,
    getBossTapeStrip: () => d.gamePanelPlayfieldRef.value?.bossTapeStripRef?.value ?? null,
  });

  bossMechanicsCtrl.bindNotifyBossRestrictionTreasures(d.notifyBossRestrictionTreasures);

  d.wireBossMechanicsBridge(bossMechanicsCtrl);

  const deckPreview = useDeckPreviewLayer({
    showDeckLayer: d.showDeckLayer,
    grid: d.grid,
    deckStacksView: d.deckStacksView,
    deckCount: d.deckCount,
    initialDeckSnapshot: d.initialDeckSnapshot,
    gridTileLetterForRender: gpWordSlotPresentation.gridTileLetterForRender,
    gridTileRarityForRender: gpWordSlotPresentation.gridTileRarityForRender,
    overlayStack: d.overlayStackController,
    canOpenTileDetail: tileDetailCtrl.canOpenTileDetail,
    openTileDetail: tileDetailCtrl.openTileDetail,
    buildTileDetailPayloadFromTile: tileDetailCtrl.buildTileDetailPayloadFromTile,
    buildTileDetailPayloadFromDeckCard: tileDetailCtrl.buildTileDetailPayloadFromDeckCard,
    tileOriginRectFromElement: tileDetailCtrl.tileOriginRectFromElement,
    armTileLongPressFromPointer: tileDetailCtrl.armTileLongPressFromPointer,
    clearTileLongPressArm: tileDetailCtrl.clearTileLongPressArm,
    suppressTilePrimaryClick: tileDetailCtrl.suppressTilePrimaryClick,
    dictFatalError: d.dictFatalError,
    deckCardRaw: d.deckCardRaw,
    resolveLetterFromRaw: d.resolveLetterFromRaw,
    getRarityForLetter: d.getRarityForLetter,
    normalizeExclusiveTileAccessoryPair: d.normalizeExclusiveTileAccessoryPair,
  });
  d.deckPreviewBridge.current = deckPreview;

  const runResultPresentationCtrl = useRunResultPresentation({
    scoringAnimating: d.scoringAnimating,
    dictionaryReady: d.dictionaryReady,
    resolvedWordForSubmit: d.resolvedWordForSubmit,
    effectiveWordForSubmit: d.effectiveWordForSubmit,
    effectiveFormulaTiles: gpWordSlotPresentation.effectiveFormulaTiles,
    bossSoftWordViolationPreview: bossMechanicsCtrl.bossSoftWordViolationPreview,
    lengthLevelsByLength: d.lengthLevelsByLength,
    lengthUpgradeObservatoryExtra: d.lengthUpgradeObservatoryExtra,
    isFlintBossActive: bossMechanicsCtrl.isFlintBossActive,
    getWordLetterCount: d.getWordLetterCount,
    judgedLengthTableLenForRun: d.judgedLengthTableLenForRun,
    getWordLengthScoreForTableLen: d.getWordLengthScoreForTableLen,
    getLengthMultiplier: d.getLengthMultiplier,
    scaleLengthContributionForBoss: d.scaleLengthContributionForBoss,
  });

  return {
    gpWordSlotPresentation,
    wordDefinitionCtrl,
    wordFavoriteCtrl,
    tileDetailCtrl,
    ...pauseOverlay,
    pauseOverlaySession,
    bossMechanicsCtrl,
    deckPreview,
    runResultPresentationCtrl,
  };
}

/**
 * @param {object} d
 * @param {'early' | 'late'} d.phase
 */
export function wireGamePanelControllers(d) {
  if (d.phase === "early") {
    return wireGamePanelControllersEarly(d);
  }
  if (d.phase === "late") {
    return wireGamePanelControllersLate(d);
  }
  throw new Error(`wireGamePanelControllers: unknown phase ${String(d.phase)}`);
}
