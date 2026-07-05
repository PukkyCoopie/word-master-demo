import { createStageSettlementFlow } from "../game/stageSettlementAnim.js";
import { useStageSettlementController } from "./controllers/useStageSettlementController.js";
import { mountRunSessionNamespaces } from "./useRunSession.js";
import { buildSettlementSnapshot } from "../game/buildSettlementSnapshot.js";
import { countOwnedRentalTreasures } from "../game/treasureHourglassRuntime.js";

/**
 * 小关结算 flow + settlement UI namespace + openStageSettlementSlot 回填。
 * @param {object} d
 * @returns {{ stageSettlementFlow: ReturnType<typeof createStageSettlementFlow>, settlementUi: ReturnType<typeof useStageSettlementController>, assignOpenStageSettlement: (fn: () => Promise<void>) => void }}
 */
export function wireGamePanelSettlement(d) {
  const runAutoSave = {
    scheduleAutoSave: d.runSaveBridge.scheduleAutoSave,
    tryFlush: d.runSaveBridge.tryFlush,
    cancelPending: d.runSaveBridge.cancelPending,
  };

  function scheduleRunAutoSave() {
    d.runSaveBridge.scheduleAutoSave();
  }

  function buildSettlementSnapshotForFlow() {
    return buildSettlementSnapshot({
      moneyBefore: d.money.value,
      clearReward: d.stageRewardYuan.value,
      remainingWords: d.remainingWords.value,
      remainingRemovals: d.remainingRemovals.value,
      rentalTreasureCount: countOwnedRentalTreasures(d.ownedTreasures.value),
      runPresetId: d.runPresetId.value,
      ownedVoucherIds: d.ownedVoucherIds.value,
      ownedSlotTreasureIds: d.ownedSlotTreasureIdList(),
    });
  }

  const stageSettlementFlow = createStageSettlementFlow({
    showSettlement: d.showSettlement,
    disableSettlementLayerAnim: d.disableSettlementLayerAnim,
    settlementSnapshot: d.settlementSnapshot,
    settlementPortalZ: d.settlementPortalZ,
    bumpOverlayZ: d.bumpOverlayZ,
    scheduleOverlayPresent: (ms = 280) => d.scheduleOverlayPresent(ms),
    scheduleOverlayDismiss: (ms = 240) => d.scheduleOverlayDismiss(ms),
    showDeckLayer: d.showDeckLayer,
    showPauseOptions: d.showPauseOptions,
    dismissTileDetailLayer: d.tileDetailCtrl.dismissTileDetailLayer,
    transitionBusy: d.transitionBusy,
    money: d.money,
    showShop: d.showShop,
    resetDeckAfterStageEnd: d.resetDeckAfterStageEnd,
    playWalletHeaderGainAnim: d.playWalletHeaderGainAnim,
    getShopWalletEl: () => d.shopPanelRef.value?.getWalletEl?.() ?? null,
    flushAchievementUnlocks: d.flushAchievementUnlocks,
    scheduleRunAutoSave,
    recordAchievementRunInterest: d.recordAchievementRunInterest,
    achievementRunState: d.achievementRunState,
    getIrisTransition: () => d.irisTransition,
    runLevelEndPreSettlementFx: d.runLevelEndPreSettlementFx,
    recordPointerClientFromEvent: d.recordPointerClientFromEvent,
    triggerHaptic: d.triggerHaptic,
    nextTick: d.nextTick,
    buildSnapshot: buildSettlementSnapshotForFlow,
    getLayerAnim: () => ({
      runIntro: () => d.settlementLayerRef.value?.runIntro?.() ?? Promise.resolve(),
      finishIntroInstant: () => d.settlementLayerRef.value?.finishIntroInstant?.() ?? false,
      resetAnimValues: () => d.settlementLayerRef.value?.resetAnimValues?.(),
    }),
  });

  const { openStageSettlement, onSettlementContinue } = stageSettlementFlow;

  const settlementUi = useStageSettlementController({
    showSettlement: d.showSettlement,
    disableSettlementLayerAnim: d.disableSettlementLayerAnim,
    settlementSnapshot: d.settlementSnapshot,
    settlementPortalZ: d.settlementPortalZ,
    onSettlementContinue,
  });

  d.mountGamePanelSessionNamespaces({
    pauseOverlay: d.pauseOverlaySession,
    ui: {
      ...d.session.ui,
      settlement: settlementUi,
    },
  });

  return {
    stageSettlementFlow,
    settlementUi,
    openStageSettlement,
    onSettlementContinue,
    enterEndlessModeAfterWin: stageSettlementFlow.enterEndlessModeAfterWin,
  };
}
