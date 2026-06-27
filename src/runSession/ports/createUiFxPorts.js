/** @typedef {ReturnType<typeof createUiFxPorts>} UiFxPort */

/** @typedef {import('./uiFxPortTypes.js').UiFxPortBinding} UiFxPortBinding */

/**
 * UI 动效 / bubble 域 assembly 端口（R4.5）。
 * @param {UiFxPortBinding} binding
 */
export function createUiFxPorts(binding) {
  return Object.freeze({
    pulseFill: binding.pulseFill,
    pulseFormulaPanelNum: binding.pulseFormulaPanelNum,
    pulseFormulaMultMultiplyBurst: binding.pulseFormulaMultMultiplyBurst,
    showScoreBubble: binding.showScoreBubble,
    wobbleScoreSlot: binding.wobbleScoreSlot,
    createWobbleScoreSlotTimeline: binding.createWobbleScoreSlotTimeline,
    awaitWobbleScoreSlotTimeline: binding.awaitWobbleScoreSlotTimeline,
    triggerAccessoryChipRipple: binding.triggerAccessoryChipRipple,
    showMultMultiplyBubble: binding.showMultMultiplyBubble,
    scheduleSmallPlusBubbleOutro: binding.scheduleSmallPlusBubbleOutro,
    scheduleMultMultiplyBubbleOutro: binding.scheduleMultMultiplyBubbleOutro,
    formatMoneyBubbleLabel: binding.formatMoneyBubbleLabel,
    clearAllTreasureSlotWobbleFront: binding.clearAllTreasureSlotWobbleFront,
    wobbleGameTreasureSlot: binding.wobbleGameTreasureSlot,
  });
}
