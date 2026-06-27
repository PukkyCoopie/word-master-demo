/**
 * GamePanel 读档/新局 bootstrap source（闭包自 GamePanel 迁出）。
 * @param {object} d
 */
export function createGamePanelBootstrapSource(d) {
  return {
    setSuppressShopEnterVisitInit: (v) => {
      d.shopPhase.suppressShopEnterVisitInit.value = v;
    },
    hydrateFromPayload: (payload) => d.runSaveBridge.hydrateFromPayload(payload),
    syncShopUpgradesFreeFromOwnedTreasures: () =>
      d.syncShopUpgradesFreeFromOwnedTreasures(d.ownedSlotTreasureIdList(), d.treasureRunState.value),
    syncPlayerMarkBatchCounterFromGrid: d.syncPlayerMarkBatchCounterFromGrid,
    getTreasureRunState: () => d.treasureRunState.value,
    rollRandomBigramForTreasure: d.rollRandomBigramForTreasure,
    registerMaskBubbleDevConsoleHook: d.registerMaskBubbleDevConsoleHook,
    setSlotRafLastTime: d.setSlotRafLastTime,
    ensureSlotRafRunning: d.ensureSlotRafRunning,
    nextTick: d.nextTick,
    setGridIntroDone: d.setGridIntroDone,
    setGridRefillAnimating: d.setGridRefillAnimating,
    getGridCellCount: d.getGridCellCount,
    getGridTileEl: d.getGridTileEl,
    updateSlotPositions: d.updateSlotPositions,
    getShowShop: d.getShowShop,
    shopVisitStockMissingFromSave: d.shopPhase.shopVisitStockMissingFromSave,
    refreshShopVoucherShelfForCurrentVisit: d.shopPhase.refreshShopVoucherShelfForCurrentVisit,
    applyShopVisitStockRoll: d.shopPhase.applyShopVisitStockRoll,
    scheduleRunAutoSave: d.scheduleRunAutoSave,
    flushAchievementUnlocks: d.flushAchievementUnlocks,
    setRunPresetId: d.setRunPresetId,
    getRunPresetIdProp: d.getRunPresetIdProp,
    setRunDifficultyIndex: d.setRunDifficultyIndex,
    getRunDifficultyIndexForNewRun: d.getRunDifficultyIndexForNewRun,
    getRunDifficultyIndexProp: d.getRunDifficultyIndexProp,
    applyRunPresetStartEffects: d.applyRunPresetStartEffects,
    isMaskBubbleDevScenarioActive: d.isMaskBubbleDevScenarioActive,
    applyMaskBubbleOwnedTreasures: d.applyMaskBubbleOwnedTreasures,
    isPagerDevScenarioActive: d.isPagerDevScenarioActive,
    applyPagerOwnedTreasure: d.applyPagerOwnedTreasure,
    isCeruleanBellDevScenarioActive: d.isCeruleanBellDevScenarioActive,
    applyCeruleanBellDevRunStart: d.applyCeruleanBellDevRunStart,
    getGamePanelAlive: d.getGamePanelAlive,
    getLevelIndex: d.getLevelIndex,
    resetLevelAfterTreasurePrep: d.resetLevelAfterTreasurePrep,
    runNewRunGridIntro: d.runNewRunGridIntro,
  };
}
