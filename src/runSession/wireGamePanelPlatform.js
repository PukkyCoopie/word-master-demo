import { buildGamePanelAndroidBackHandler } from "./buildGamePanelAndroidBackHandler.js";
import { useGamePanelPlatformController } from "./controllers/useGamePanelPlatformController.js";
import { createGamePanelDisposer } from "./createGamePanelDisposer.js";

/**
 * Android back + platform controller + dispose 列表。
 * @param {object} d
 */
export function wireGamePanelPlatform(d) {
  const { handleAndroidBack } = buildGamePanelAndroidBackHandler({
    transitionBusy: d.transitionBusy,
    shopUpgradeAnimating: d.shopPhase.shopUpgradeAnimating,
    packPickBusy: d.packPickBusy,
    packPickSkipBusy: d.packPickSkipBusy,
    submitWordBusy: d.submitWordBusy,
    scoringAnimating: d.scoringAnimating,
    gridRefillAnimating: d.gridRefillAnimating,
    spellTargetSession: d.spellTargetSession,
    bossRerollSession: d.bossRerollSession,
    packPickSession: d.packPickSession,
    spellReferencePreview: d.spellReferencePreview,
    treasureDetail: d.treasureDetail,
    tileDetailPayload: d.tileDetailCtrl.tileDetailPayload,
    showShop: d.showShop,
    showDeckLayer: d.showDeckLayer,
    showInfoLayer: d.showInfoLayer,
    showPauseOptions: d.showPauseOptions,
    showDeveloperOptions: d.showDeveloperOptions,
    developerOptionsLayerRef: d.developerOptionsLayerRef,
    closeDeveloperOptions: d.closeDeveloperOptions,
    showSettlement: d.showSettlement,
    showRunEnd: d.showRunEnd,
    dictFatalError: d.dictFatalError,
    isBlockingPauseOpen: d.isBlockingPauseOpen,
    onSpellTargetCancel: d.onSpellTargetCancel,
    dismissBossReroll: d.dismissBossRerollOnBack,
    onPackPickSkip: d.onPackPickSkip,
    dismissTileDetail: d.tileDetailCtrl.dismissTileDetailLayer,
    openPauseOptionsFromShop: d.openPauseOptionsFromShop,
    closePauseOptions: d.closePauseOptions,
    settlementIntroPending: d.settlementIntroPending,
    finishSettlementIntroInstant: d.finishSettlementIntroInstant,
    onSettlementContinue: d.onSettlementContinue,
    openPauseOptions: d.openPauseOptions,
    onTreasureDetailClose: d.onTreasureDetailClose,
    runOverlayHostRef: d.runOverlayHostRef,
  });

  const platformCtrl = useGamePanelPlatformController({
    onAndroidBack: handleAndroidBack,
    onViewportResize: d.onWordSlotsLayoutResize,
  });

  const disposeGamePanel = createGamePanelDisposer([
    () => d.disposeFirstWordTutorial(),
    () => d.resetGamePause(),
    () => platformCtrl.dispose(),
    () => d.runAutoSave.tryFlush({ force: true }),
    () => d.runAutoSave.cancelPending(),
    () => d.discardController.dispose(),
    () => d.tileDetailCtrl.dispose(),
    () => {
      d.setGamePanelAlive(false);
    },
    () => d.settlementLayerRef.value?.dispose?.(),
    () => d.disposeSettlementWalletGainAnim(),
    () => d.disposeHeaderDomFx(),
    () => d.disposeSubmitCountDeltaTimer(),
    () => d.tileDetailCtrl.clearTileLongPressArm(),
  ]);

  return { platformCtrl, disposeGamePanel, handleAndroidBack };
}
