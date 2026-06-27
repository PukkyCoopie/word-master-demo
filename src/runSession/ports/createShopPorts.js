/** @typedef {ReturnType<typeof createShopPorts>} ShopPort */

/** @typedef {import('./shopPortTypes.js').ShopPortBinding} ShopPortBinding */

/**
 * 商店域 assembly 端口（R4.1）。
 * @param {ShopPortBinding} binding
 */
export function createShopPorts(binding) {
  return Object.freeze({
    showShop: binding.showShop,
    shopPanelRef: binding.shopPanelRef,
    shopPhase: binding.shopPhase,
    shopOffers: binding.shopOffers,
    packOffers: binding.packOffers,
    shopRerollsThisVisit: binding.shopRerollsThisVisit,
    shopVoucherShelf: binding.shopVoucherShelf,
    shopVoucherBonusShelf: binding.shopVoucherBonusShelf,
    shopVoucherShelfGeneration: binding.shopVoucherShelfGeneration,
    shopPortalZ: binding.shopPortalZ,
    shopPortalStackStyle: binding.shopPortalStackStyle,
    shopOverlayLayersSuppressed: binding.shopOverlayLayersSuppressed,
    shopInteractionsDisabled: binding.shopInteractionsDisabled,
    shopSelectionBridge: binding.shopSelectionBridge,
    shopSpellRuntimeBridge: binding.shopSpellRuntimeBridge,
    initShopViewContext: binding.initShopViewContext,
    onShopNextLevel: binding.onShopNextLevel,
    onShopReroll: binding.onShopReroll,
    onShopSelectOffer: binding.onShopSelectOffer,
    onShopSelectOwned: binding.onShopSelectOwned,
    onShopSelectPackOffer: binding.onShopSelectPackOffer,
    onShopReorderOwned: binding.onShopReorderOwned,
    onShopUpgradeInteractionUnlock: binding.onShopUpgradeInteractionUnlock,
    openShopPackSession: binding.openShopPackSession,
    notifyShopLeave: binding.notifyShopLeave,
    applyUpgradeFromOffer: binding.applyUpgradeFromOffer,
    buildUpgradeAnimPayloadFromOffer: binding.buildUpgradeAnimPayloadFromOffer,
    buildRollBundleOptionsCtx: binding.buildRollBundleOptionsCtx,
    buildRollInRunBundlePackCtx: binding.buildRollInRunBundlePackCtx,
    buildShopOwnedPreviewNavItems: binding.buildShopOwnedPreviewNavItems,
    playArrowUpShopUpgradeSequence: binding.playArrowUpShopUpgradeSequence,
    playEclipseLengthUpgradeSequence: binding.playEclipseLengthUpgradeSequence,
    playEclipseRarityUpgradeSequence: binding.playEclipseRarityUpgradeSequence,
    runShopUpgradePlaybackSteps: binding.runShopUpgradePlaybackSteps,
    runInRunUpgradePlaybackSteps: binding.runInRunUpgradePlaybackSteps,
    buildEclipseLengthUpgradeSteps: binding.buildEclipseLengthUpgradeSteps,
    buildEclipseRarityUpgradeSteps: binding.buildEclipseRarityUpgradeSteps,
    buildInRunLengthUpgradeStep: binding.buildInRunLengthUpgradeStep,
    canPlaceTreasureOffer: binding.canPlaceTreasureOffer,
    fulfillPackInnerPurchase: binding.fulfillPackInnerPurchase,
    packPickSession: binding.packPickSession,
    packPickBusy: binding.packPickBusy,
    packPickSkipBusy: binding.packPickSkipBusy,
    packPickOverlaySuppressed: binding.packPickOverlaySuppressed,
    packPickOptionKeyOf: binding.packPickOptionKeyOf,
    packPickRequiredPicks: binding.packPickRequiredPicks,
    runInRunPackPickFlow: binding.runInRunPackPickFlow,
    onPackInnerClaim: binding.onPackInnerClaim,
    onPackPickSkip: binding.onPackPickSkip,
    ensurePackPickOverlayVisible: binding.ensurePackPickOverlayVisible,
    shouldRestorePackPickOverlayAfterSpellConfirm: binding.shouldRestorePackPickOverlayAfterSpellConfirm,
    glyphShopSkipLevelAdvance: binding.glyphShopSkipLevelAdvance,
  });
}
