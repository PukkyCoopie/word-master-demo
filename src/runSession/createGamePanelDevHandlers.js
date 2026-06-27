import { ACCESSORY_CROP } from "../accessories/accessoryCatalog.js";
import { initTreasureBankOnAcquire } from "../treasures/treasureAcquireInit.js";
import { devConvertDeckTiles } from "../dev/devDeckTileConvert.js";
import { grantDevOwnedTreasuresByIds } from "../dev/devGrantTreasures.js";

/**
 * Developer 选项层回调 + dev grant deps。
 * @param {object} d
 */
export function createGamePanelDevHandlers(d) {
  function buildDevGrantTreasureDeps() {
    return {
      getOwnedTreasures: () => d.ownedTreasures.value,
      setOwnedTreasures: (slots) => {
        d.ownedTreasures.value = slots;
      },
      findTreasurePlacementIndex: d.findTreasurePlacementIndex,
      buildOwnedTreasureSlot: d.buildOwnedTreasureSlot,
      noteCollectionTreasureAcquired: d.noteCollectionTreasureAcquired,
      initTreasureBankOnAcquire,
      applyTreasureAcquireImmediateEffectsForRun: d.applyTreasureAcquireImmediateEffectsForRun,
      getTreasureRunState: () => d.treasureRunState.value,
      accessoryCropId: ACCESSORY_CROP,
      expandWithCropWhenFull: true,
    };
  }

  function onDeveloperConvertDeck(payload) {
    const result = devConvertDeckTiles({
      deck: d.deck.value,
      grid: d.grid.value,
      rows: d.ROWS,
      cols: d.COLS,
      scope: payload?.scope,
      targetMaterialId: payload?.targetMaterialId,
      rng: d.runRandom,
      rarityLevelsByRarity: d.rarityLevelsByRarity.value,
    });
    d.touchGrid();
    d.scheduleRunAutoSave();
    d.developerOptionsLayerRef.value?.reportConvertResult?.(result);
  }

  async function onDeveloperJumpLevel(payload) {
    const levelId = String(payload?.levelId ?? "").trim();
    if (!levelId) return;
    await d.devCommandsRef.current?.jumpToLevelDev(levelId, { skipIntro: true });
  }

  function onDeveloperGrantTreasures(payload) {
    const ids = Array.isArray(payload?.treasureIds) ? payload.treasureIds : [];
    if (!ids.length) return;
    const results = grantDevOwnedTreasuresByIds(ids, buildDevGrantTreasureDeps());
    let granted = 0;
    let failed = 0;
    let cropCount = 0;
    for (const r of results) {
      if (r.ok) {
        granted += 1;
        if (r.usedCrop) cropCount += 1;
      } else {
        failed += 1;
      }
    }
    d.scheduleRunAutoSave();
    d.developerOptionsLayerRef.value?.reportGrantResult?.({ granted, failed, cropCount });
  }

  return {
    buildDevGrantTreasureDeps,
    onDeveloperConvertDeck,
    onDeveloperJumpLevel,
    onDeveloperGrantTreasures,
  };
}

/**
 * @param {object} d
 */
export function buildGamePanelDevCommandsOptions(d) {
  return {
    refs: {
      maskBubbleDevScenarioActive: d.maskBubbleDevScenarioActive,
      allIceDevScenarioActive: d.allIceDevScenarioActive,
      ceruleanBellDevScenarioActive: d.ceruleanBellDevScenarioActive,
      pagerDevScenarioActive: d.pagerDevScenarioActive,
      promoScreenshotDevPresetActive: d.promoScreenshotDevPresetActive,
      ownedTreasures: d.ownedTreasures,
      transitionBusy: d.transitionBusy,
      showShop: d.showShop,
      showSettlement: d.showSettlement,
      showRunEnd: d.showRunEnd,
      showPauseOptions: d.showPauseOptions,
      showDeveloperOptions: d.showDeveloperOptions,
      levelIndex: d.levelIndex,
      pendingBossSlugOverride: d.pendingBossSlugOverride,
      gridIntroDone: d.gridIntroDone,
      gridRefillAnimating: d.gridRefillAnimating,
      gridTileRefs: d.gridTileRefs,
      glyphShopSkipLevelAdvance: d.glyphShopSkipLevelAdvance,
      runDifficultyIndex: d.runDifficultyIndex,
      money: d.money,
      shopOverlayLayersSuppressed: d.shopOverlayLayersSuppressed,
      packPickOverlaySuppressed: d.packPickOverlaySuppressed,
      packPickSession: d.packPickSession,
      debugScoreCardTargetOverride: d.debugScoreCardTargetOverride,
      debugScoreCardRoundOverride: d.debugScoreCardRoundOverride,
      dictionaryReady: d.dictionaryReady,
    },
    ROWS: d.ROWS,
    COLS: d.COLS,
    buildOwnedTreasureSlot: d.buildOwnedTreasureSlot,
    getCurrentLevel: () => d.currentLevel.value,
    getRunLevelAtIndex: d.getRunLevelAtIndex,
    getRunLevelIndexForId: d.getRunLevelIndexForId,
    resetLevelAfterTreasurePrep: d.resetLevelAfterTreasurePrep,
    runPendingAfterGridTilesSettled: d.runPendingAfterGridTilesSettled,
    runGridIntroAfterReset: d.runGridIntroAfterReset,
    playLevelAdvanceHeaderFx: d.playLevelAdvanceHeaderFx,
    touchGrid: d.touchGrid,
    updateSlotPositions: d.updateSlotPositions,
    scheduleRunAutoSave: d.scheduleRunAutoSave,
    nextTick: d.nextTick,
    runRandom: d.runRandom,
    shopTreasurePool: d.shopPhase.shopTreasurePool,
    loadDictionary: d.loadDictionary,
    getGamePanelAlive: d.getGamePanelAlive,
    isWildcardMaterialTile: d.isWildcardMaterialTile,
    getCandidateWordsByLength: d.getCandidateWordsByLength,
    resolveWordPattern: d.resolveWordPattern,
    rarityLevelsByRarity: d.rarityLevelsByRarity,
    buildBossWildcardResolveContext: d.buildBossWildcardResolveContext,
    nextOfferInstanceId: d.shopPhase.nextOfferInstanceId,
    grantRandomOwnedTreasuresInRunWithPopAnim: d.grantRandomOwnedTreasuresInRunWithPopAnim,
    tryCeruleanBellMarkAfterGridStable: d.tryCeruleanBellMarkAfterGridStable,
    getGrid: () => d.grid.value,
    selectTile: d.selectTile,
    removeFromSlot: d.removeFromSlot,
    getSelectedOrderLength: () => d.selectedOrder.value.length,
    submitWord: d.submitWord,
    getScoringAnimating: () => d.scoringAnimating.value,
    getGridRefillAnimating: () => d.gridRefillAnimating.value,
    getSubmitWordBusy: () => d.submitWordBusy.value,
  };
}
