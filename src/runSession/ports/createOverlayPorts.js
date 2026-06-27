/** @typedef {ReturnType<typeof createOverlayPorts>} OverlayPort */

/** @typedef {import('./overlayPortTypes.js').OverlayPortBinding} OverlayPortBinding */

/**
 * 浮层 / modal 域 assembly 端口（R4.5）。
 * @param {OverlayPortBinding} binding
 */
export function createOverlayPorts(binding) {
  return Object.freeze({
    showDeckLayer: binding.showDeckLayer,
    showInfoLayer: binding.showInfoLayer,
    showPauseOptions: binding.showPauseOptions,
    showSettlement: binding.showSettlement,
    showRunEnd: binding.showRunEnd,
    showTreasureCollectionLayer: binding.showTreasureCollectionLayer,
    wordDefinitionCtrl: binding.wordDefinitionCtrl,
    tileDetailCtrl: binding.tileDetailCtrl,
    runResultPresentationCtrl: binding.runResultPresentationCtrl,
    bossMechanicsCtrl: binding.bossMechanicsCtrl,
    shopTransactionCtrl: binding.shopTransactionCtrl,
    treasureInventoryCtrl: binding.treasureInventoryCtrl,
    showWordDefinitionTrigger: binding.showWordDefinitionTrigger,
    openInfoModal: binding.openInfoModal,
    openPauseOptions: binding.openPauseOptions,
    openPauseOptionsFromShop: binding.openPauseOptionsFromShop,
    openRunEnd: binding.openRunEnd,
    openStageSettlement: binding.openStageSettlement,
    openTileDetail: binding.openTileDetail,
    openWordDefinitionLayer: binding.openWordDefinitionLayer,
    dismissTileDetailLayer: binding.dismissTileDetailLayer,
    setGameTreasureSlotRef: binding.setGameTreasureSlotRef,
    runOverlayHostRef: binding.runOverlayHostRef,
    gamePanelPlayfieldRef: binding.gamePanelPlayfieldRef,
    firstWordTutorialLayerRef: binding.firstWordTutorialLayerRef,
    spellTargetSession: binding.spellTargetSession,
    spellReferencePreview: binding.spellReferencePreview,
    spellGrantDetailCloseHandler: binding.spellGrantDetailCloseHandler,
    pendingSpellTileAppearanceAnim: binding.pendingSpellTileAppearanceAnim,
    tileDetailPayload: binding.tileDetailPayload,
    tileDetailPreviewNav: binding.tileDetailPreviewNav,
    tileOriginRectFromElement: binding.tileOriginRectFromElement,
    wordDefinitionExtraCount: binding.wordDefinitionExtraCount,
    wordDefinitionHiddenForWordLeave: binding.wordDefinitionHiddenForWordLeave,
    wordDefinitionPreviewLine: binding.wordDefinitionPreviewLine,
    wordDefinitionPreviewWord: binding.wordDefinitionPreviewWord,
    wordDefinitionTriggerMode: binding.wordDefinitionTriggerMode,
    wordDefinitionZoneVisible: binding.wordDefinitionZoneVisible,
    wordTranslationInnerRef: binding.wordTranslationInnerRef,
    wordTranslationWrapRef: binding.wordTranslationWrapRef,
    transitionBusy: binding.transitionBusy,
    isRunFlowOverlayOpen: binding.isRunFlowOverlayOpen,
    isFirstWordTutorialBlockingInput: binding.isFirstWordTutorialBlockingInput,
    isGamePaused: binding.isGamePaused,
    showToast: binding.showToast,
  });
}
