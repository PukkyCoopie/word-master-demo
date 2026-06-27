/** @typedef {ReturnType<typeof createScoringPorts>} ScoringPort */

/** @typedef {import('./scoringPortTypes.js').ScoringPortBinding} ScoringPortBinding */

/**
 * 提交 / 计分 presentation 域 assembly 端口（R4.5）。
 * @param {ScoringPortBinding} binding
 */
export function createScoringPorts(binding) {
  return Object.freeze({
    canSubmit: binding.canSubmit,
    resolvedWordForSubmit: binding.resolvedWordForSubmit,
    effectiveWordForSubmit: binding.effectiveWordForSubmit,
    effectiveWordPartsForSubmit: binding.effectiveWordPartsForSubmit,
    buildEffectiveWordPartsForSubmit: binding.buildEffectiveWordPartsForSubmit,
    resolveWordFromEffectiveParts: binding.resolveWordFromEffectiveParts,
    listEffectiveTilesForSubmit: binding.listEffectiveTilesForSubmit,
    resolveRealSubmitTileForWordSlot: binding.resolveRealSubmitTileForWordSlot,
    buildSubmitAfterLettersContext: binding.buildSubmitAfterLettersContext,
    applySubmitRefill: binding.applySubmitRefill,
    applyHookBossAfterSubmit: binding.applyHookBossAfterSubmit,
    deferredWordSubmitPayload: binding.deferredWordSubmitPayload,
    submitWordBusy: binding.submitWordBusy,
    submitDeltaKey: binding.submitDeltaKey,
    submitTranslationLines: binding.submitTranslationLines,
    scoringAnimating: binding.scoringAnimating,
    scoringLetterIndex: binding.scoringLetterIndex,
    scoringTreasureBarIndex: binding.scoringTreasureBarIndex,
    suppressResultWordLengthUntilScoringEnd: binding.suppressResultWordLengthUntilScoringEnd,
    showResultTotalBar: binding.showResultTotalBar,
    showResultWordLength: binding.showResultWordLength,
    hideResultWordLengthBeforeTotal: binding.hideResultWordLengthBeforeTotal,
    resultTotalShown: binding.resultTotalShown,
    resultWordLengthLevel: binding.resultWordLengthLevel,
    resultWordLengthShown: binding.resultWordLengthShown,
    rewardDollarMarks: binding.rewardDollarMarks,
    roundScoreOverride: binding.roundScoreOverride,
    animMultTotal: binding.animMultTotal,
    animResultTotal: binding.animResultTotal,
    animScoreSum: binding.animScoreSum,
    displayFormulaMult: binding.displayFormulaMult,
    displayFormulaScore: binding.displayFormulaScore,
    headerRoundScoreValue: binding.headerRoundScoreValue,
    headerTargetScoreValue: binding.headerTargetScoreValue,
    stageRewardYuan: binding.stageRewardYuan,
    settlementSnapshot: binding.settlementSnapshot,
    flashSubmitCountDelta: binding.flashSubmitCountDelta,
    scheduleStaggeredTileRemoveHaptics: binding.scheduleStaggeredTileRemoveHaptics,
    formatNum: binding.formatNum,
    getResultMultNumEl: binding.getResultMultNumEl,
    getResultScoreNumEl: binding.getResultScoreNumEl,
    getResultTotalEl: binding.getResultTotalEl,
    getWordDefinition: binding.getWordDefinition,
    canOpenTileDetail: binding.canOpenTileDetail,
    buildTileDetailPayloadFromDeckCard: binding.buildTileDetailPayloadFromDeckCard,
    buildTileDetailPayloadFromTile: binding.buildTileDetailPayloadFromTile,
    buildWordSlotTileDetailPayload: binding.buildWordSlotTileDetailPayload,
    buildWordSlotPreviewNav: binding.buildWordSlotPreviewNav,
    setLastWordFromSubmit: binding.setLastWordFromSubmit,
    flushDeferredWordSubmitRecord: binding.flushDeferredWordSubmitRecord,
    flushSubmitAchievements: binding.flushSubmitAchievements,
    flushAchievementUnlocks: binding.flushAchievementUnlocks,
  });
}
