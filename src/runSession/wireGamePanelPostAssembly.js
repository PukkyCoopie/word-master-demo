import { watch } from "vue";
import { bindGpPlayfieldBridge } from "./gpPlayfieldBridge.js";
import { wireShopTransactionPostAssembly } from "./controllers/useShopTransactionController.js";
import { createGamePanelDevCommands } from "../dev/gamePanelDevCommands.js";
import { registerGamePanelSmokeHarness } from "../dev/gamePanelSmokeHarness.js";

/**
 * assembly 后回填 packPick / spell / playfield / dev 接线。
 * @param {object} d
 */
export function wireGamePanelPostAssembly(d) {
  const pa = d.panelAssembly;

  d.firstWordTutorialCtrlSlot.ctrl = pa.firstWordTutorialCtrl;
  watch(
    pa.firstWordTutorialCtrl.active,
    (active) => {
      d.firstWordTutorialActive.value = active;
    },
    { immediate: true },
  );

  d.shopSpellRuntimeBridge._ctx = () => pa.spellCastController.buildSpellRuntimeContext();

  wireShopTransactionPostAssembly(d.shopTransactionCtrl, {
    onPackInnerClaim: pa.onPackInnerClaim,
    fulfillPackInnerPurchase: pa.fulfillPackInnerPurchase,
    openShopPackSession: pa.openShopPackSession,
    isSpellGrantDetailOpenGuardActive: pa.spellCastController.isSpellGrantDetailOpenGuardActive,
    getSpellGrantDetailPendingPurchasedSpellId:
      pa.spellCastController.getSpellGrantDetailPendingPurchasedSpellId,
    fulfillSpellGrantDetailCast: pa.spellCastController.fulfillSpellGrantDetailCast,
    fulfillStarSpellShopPurchase: pa.spellCastController.fulfillStarSpellShopPurchase,
    runSpellPreviewChain: pa.spellCastController.runSpellPreviewChain,
    runSpellPreviewChainAfterDetailClose: pa.spellCastController.runSpellPreviewChainAfterDetailClose,
    maybeEndShopTutorialOnTreasurePurchase: pa.maybeEndShopTutorialOnTreasurePurchase,
  });

  bindGpPlayfieldBridge(pa.playfieldController);
  d.playfieldActionsRef.current = pa.playfieldController;

  d.devCommandsRef.current = createGamePanelDevCommands(d.devCommandsOptions);
  d.disposeSmokeHarness?.();
  d.disposeSmokeHarness = registerGamePanelSmokeHarness(d.devCommandsOptions);

  return {
    packPickController: pa.packPickController,
    packPickSession: pa.packPickSession,
    packPickBusy: pa.packPickBusy,
    packPickSkipBusy: pa.packPickSkipBusy,
    packPickOverlaySuppressed: pa.packPickOverlaySuppressed,
    packPickOptionKeyOf: pa.packPickOptionKeyOf,
    packPickRequiredPicks: pa.packPickRequiredPicks,
    runInRunPackPickFlow: pa.runInRunPackPickFlow,
    onPackPickSkip: pa.onPackPickSkip,
    onPackInnerClaim: pa.onPackInnerClaim,
    fulfillPackInnerPurchase: pa.fulfillPackInnerPurchase,
    ensurePackPickOverlayVisible: pa.ensurePackPickOverlayVisible,
    shouldRestorePackPickOverlayAfterSpellConfirm: pa.shouldRestorePackPickOverlayAfterSpellConfirm,
    openShopPackSession: pa.openShopPackSession,
    runEndCtrlSlot: pa.runEndCtrl,
    spellGrantDetailCloseHandler: pa.spellCastController.handleSpellGrantDetailClose,
    queueOrRunSpellTileAppearanceAnim: pa.spellCastController.queueOrRunSpellTileAppearanceAnim,
    runSpellPreviewChain: pa.spellCastController.runSpellPreviewChain,
    runSpellPreviewChainAfterDetailClose: pa.spellCastController.runSpellPreviewChainAfterDetailClose,
    runInRunSpellGrant: pa.spellCastController.runInRunSpellGrant,
    onSpellTargetConfirm: pa.spellCastController.onSpellTargetConfirm,
    onSpellTargetCancel: pa.spellCastController.onSpellTargetCancel,
  };
}
