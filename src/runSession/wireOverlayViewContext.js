import { computed } from "vue";
import { createTreasureOverlayPurchaseState } from "./treasureOverlayPurchase.js";

/**
 * RunOverlayHost viewContext 接线（含 treasureCanBuyOffer computed）。
 * @param {import('./controllers/useOverlayStackController.js').OverlayStackController} overlayStackController
 * @param {Record<string, unknown>} deps
 */
export function wireOverlayViewContext(overlayStackController, deps) {
  const purchase = createTreasureOverlayPurchaseState({
    treasureDetail: deps.treasureDetail,
    packPickSession: deps.packPickSession,
    packPickOptionKeyOf: deps.packPickOptionKeyOf,
    packPickRequiredPicks: deps.packPickRequiredPicks,
    money: deps.money,
    levelIndex: deps.levelIndex,
    isEndlessRun: deps.isEndlessRun,
    shopPhase: deps.shopPhase,
    canPlaceTreasureOffer: deps.canPlaceTreasureOffer,
  });

  overlayStackController.initViewContext({
    walletHeaderShown: deps.walletHeaderShown,
    treasureCanBuyOffer: purchase.treasureCanBuyOffer,
    treasurePackInnerAlreadyClaimed: purchase.treasurePackInnerAlreadyClaimed,
    rarityLevelsByRarity: deps.rarityLevelsByRarity,
    firstWordTutorialTreasureDetailStackZFloor: deps.firstWordTutorialTreasureDetailStackZFloor,
    showTreasureCollectionLayer: deps.showTreasureCollectionLayer,
    isAmberBossMaskActive: deps.isAmberBossMaskActive,
    gameTreasureGemClassResolver: deps.treasureInventoryCtrl.gemClassResolver,
    gameTreasureSlotClassResolver: deps.treasureInventoryCtrl.slotClassResolver,
    gameTreasureCrimsonDisabledResolver: deps.treasureInventoryCtrl.crimsonDisabledResolver,
    showEmptyTreasureSlotHelp: deps.showEmptyTreasureSlotHelp,
    showInfoLayer: deps.showInfoLayer,
    infoModalInitialTab: deps.infoModalInitialTab,
    showPauseOptions: deps.showPauseOptions,
    spellCountsByLength: deps.spellCountsByLength,
    lengthLevelsByLength: deps.lengthLevelsByLength,
    lengthUpgradeObservatoryExtra: deps.lengthUpgradeObservatoryExtra,
    runSeedDisplay: computed(() => deps.props.runSeedDisplay),
    currentLevel: deps.currentLevel,
    showShop: deps.showShop,
    infoModalNextLevelId: deps.infoModalNextLevelId,
    getRunSeedNumeric: deps.getRunSeedNumeric,
    activeBossSlug: deps.activeBossSlug,
    spellReferencePreview: deps.spellReferencePreview,
    tileDetailPayload: deps.tileDetailCtrl.tileDetailPayload,
    tileDetailOriginRect: deps.tileDetailCtrl.tileDetailOriginRect,
    tileDetailPreviewNavIndex: deps.tileDetailCtrl.tileDetailPreviewNavIndex,
    tileDetailPreviewNavTotal: deps.tileDetailCtrl.tileDetailPreviewNavTotal,
    onTreasureDetailClose: deps.onTreasureDetailClose,
    onTreasurePurchase: deps.onTreasurePurchase,
    onTreasureSell: deps.onTreasureSell,
    clearSpellReferencePreview: deps.clearSpellReferencePreview,
    closeTreasureCollectionLayer: deps.closeTreasureCollectionLayer,
    closeEmptyTreasureSlotHelp: deps.closeEmptyTreasureSlotHelp,
    closeTileDetail: deps.tileDetailCtrl.closeTileDetail,
    onGameOwnedSlotClick: deps.treasureInventoryCtrl.onOwnedSlotClick,
    onGameEmptyTreasureSlotClick: deps.treasureInventoryCtrl.onEmptySlotClick,
    onInfoSelectOwnedVoucher: deps.onInfoSelectOwnedVoucher,
    onPauseContinue: deps.onPauseContinue,
    onPauseNewRun: deps.onPauseNewRun,
    onPauseSettings: deps.onPauseSettings,
    onPauseDeveloperOptions: deps.onPauseDeveloperOptions,
    onPauseMainMenu: deps.onPauseMainMenu,
    onTilePreviewNav: deps.tileDetailCtrl.onTilePreviewNav,
    treasureGemClass: deps.treasureGemClass,
    runSeedDisplayText: computed(() => deps.props.runSeedDisplay),
  });

  return purchase;
}
