import { createInRunUpgradePlayback } from "../game/inRunUpgradePlayback.js";
import { createOwnedTreasureBarFx } from "../game/ownedTreasureBarFx.js";
import { createSubmitTileLeaveAnim } from "../game/submitTileLeaveAnim.js";
import { createTreasureDestroyFx } from "../game/treasureDestroyFx.js";
import { createTreasureHourglassStageFx } from "../game/treasureHourglassRuntime.js";
import { createVolcanoEruptionRunner } from "../game/wireVolcanoEruptionFx.js";
import { notifyOwnedTreasuresOnIceBreak } from "../treasures/treasureRegistry.js";

/**
 * @param {object} deps
 * @param {{ current: unknown }} deps.ownedBarFxRef
 */
export function wireOwnedTreasureBarFx(deps) {
  const {
    ownedBarFxRef,
    nextTick,
    findOwnedTreasureSlotIndex,
    findAllOwnedTreasureSlotIndices,
    treasureInventoryCtrl,
    shopOverlayLayersSuppressed,
    scoringTreasureBarIndex,
    money,
    wobbleGameTreasureSlot,
    wobbleScoreSlot,
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    formatMoneyBubbleLabel,
    bumpOverlayZ,
    scoringLetterGapMs,
  } = deps;

  ownedBarFxRef.current = createOwnedTreasureBarFx({
    nextTick,
    findOwnedTreasureSlotIndex,
    findAllOwnedTreasureSlotIndices,
    getOwnedTreasureBarFxEl: (slotIndex) => treasureInventoryCtrl.getBarFxEl(slotIndex),
    getShopOverlayLayersSuppressed: () => shopOverlayLayersSuppressed.value,
    setShopOverlayLayersSuppressed: (v) => {
      shopOverlayLayersSuppressed.value = v;
    },
    getScoringTreasureBarIndex: () => scoringTreasureBarIndex.value,
    setScoringTreasureBarIndex: (v) => {
      scoringTreasureBarIndex.value = v;
    },
    addMoney: (amount) => {
      money.value += Math.max(0, Math.floor(Number(amount) || 0));
    },
    wobbleGameTreasureSlot,
    wobbleScoreSlot,
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    formatMoneyBubbleLabel,
    bumpOverlayZ,
    scoringLetterGapMs,
  });
}

/**
 * @param {object} deps
 * @param {{ current: unknown }} deps.treasureDestroyFxRef
 */
export function wireTreasureDestroyFx(deps) {
  const {
    treasureDestroyFxRef,
    findOwnedTreasureSlotIndex,
    ownedTreasureHasNoSellAccessory,
    isTreasureBarSlotVisible,
    treasureInventoryCtrl,
    ownedTreasures,
    removeOwnedTreasureSlotsLeaveGapAtIndices,
    scheduleRunAutoSave,
    wobbleGameTreasureSlot,
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    createWobbleScoreSlotTimeline,
    awaitWobbleScoreSlotTimeline,
    playOwnedTreasureWobbleOnlyFx,
    shopOverlayLayersSuppressed,
    nextTick,
    onBombBlastResolved,
  } = deps;

  treasureDestroyFxRef.current = createTreasureDestroyFx({
    findOwnedTreasureSlotIndex,
    ownedTreasureHasNoSellAccessory,
    isTreasureBarSlotVisible,
    getOwnedTreasureSlotEl: treasureInventoryCtrl.getSlotElement,
    getOwnedTreasures: () => ownedTreasures.value,
    removeOwnedTreasureSlotsLeaveGapAtIndices,
    scheduleRunAutoSave,
    wobbleGameTreasureSlot,
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    createWobbleScoreSlotTimeline,
    awaitWobbleScoreSlotTimeline,
    playOwnedTreasureWobbleOnlyFx,
    setShopOverlayLayersSuppressed: (v) => {
      shopOverlayLayersSuppressed.value = v;
    },
    waitNextTick: () => nextTick(),
    onBombBlastResolved,
  });
}

/**
 * @param {object} deps
 * @param {{ current: unknown }} deps.hourglassStageFxRef
 */
export function wireHourglassStageFx(deps) {
  const {
    hourglassStageFxRef,
    ownedTreasures,
    wobbleScoreSlot,
    treasureInventoryCtrl,
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    scheduleRunAutoSave,
  } = deps;

  hourglassStageFxRef.current = createTreasureHourglassStageFx({
    getOwnedTreasures: () => ownedTreasures.value,
    setOwnedTreasures: (slots) => {
      ownedTreasures.value = slots;
    },
    wobbleScoreSlot,
    getOwnedTreasureBarFxEl: (slotIndex) => treasureInventoryCtrl.getBarFxEl(slotIndex),
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    scheduleRunAutoSave,
  });
}

/**
 * @param {object} deps
 * @param {{ current: unknown }} deps.inRunUpgradePlaybackRef
 */
export function wireInRunUpgradePlayback(deps) {
  const { inRunUpgradePlaybackRef, runResultPresentationCtrl, shopOverlayLayersSuppressed, nextTick, sleep } =
    deps;

  inRunUpgradePlaybackRef.current = createInRunUpgradePlayback({
    refs: {
      inRunGrantUpgradeFxActive: runResultPresentationCtrl.inRunGrantUpgradeFxActive,
      shopOverlayLayersSuppressed,
    },
    model: runResultPresentationCtrl.inRunGrantUpgradeFxModel,
    gameResultAreaRef: runResultPresentationCtrl.gameResultAreaRef,
    waitNextTick: () => nextTick(),
    sleep,
    getSubmitAccessoryUpgradeBatch: () => deps.submitAccessoryUpgradeBatchState?.current ?? null,
  });
}

/**
 * @param {object} deps
 * @param {{ current: unknown }} deps.submitTileLeaveFxRef
 */
export function wireSubmitTileLeaveAnim(deps) {
  const {
    submitTileLeaveFxRef,
    treasureRunState,
    getSelectedGridTileElsInOrder,
    getWordSlotRefs,
    findOwnedTreasureSlotIndex,
    runRandom,
    isBossTileDebuffed,
    removeDeckCardByUidAndNotify,
    ownedSlotTreasureIdList,
    ownedTreasureHookFxBridge,
    playTreasureSlotBubbleBurstAtPeak,
    ownedBarFxRef,
    playOwnedTreasureMoneyFx,
    wobbleGameTreasureSlot,
    triggerHaptic,
    touchGrid,
    showScoreBubble,
    createWobbleScoreSlotTimeline,
    awaitTreasureSlotWobbleElForSubmit,
    runDetachedTileShrinkReplacePop,
    scheduleSmallPlusBubbleOutro,
    sleep,
    nextTick,
  } = deps;

  submitTileLeaveFxRef.current = createSubmitTileLeaveAnim({
    refs: { treasureRunState },
    getSelectedGridTileElsInOrder,
    getWordSlotRefs,
    findOwnedTreasureSlotIndex,
    runRandom,
    isBossTileDebuffed,
    removeDeckCardByUidAndNotify,
    notifyIceBreak: async ({ iceShatterTreasureFxHandled }) => {
      await notifyOwnedTreasuresOnIceBreak(ownedSlotTreasureIdList(), {
        treasureRun: treasureRunState.value,
        iceShatterTreasureFxHandled,
        ownedSlotTreasureIds: ownedSlotTreasureIdList(),
        ...ownedTreasureHookFxBridge(),
      });
    },
    playTreasureSlotBubbleBurstAtPeak,
    playTreasureSlotMoneyBurstAtPeak: (slotIndex, amount, opts) =>
      ownedBarFxRef.current?.playTreasureSlotMoneyBurstAtPeak(slotIndex, amount, opts),
    playOwnedTreasureMoneyFx,
    wobbleGameTreasureSlot,
    triggerHaptic,
    touchGrid,
    showScoreBubble,
    createWobbleScoreSlotTimeline,
    awaitTreasureSlotWobbleEl: awaitTreasureSlotWobbleElForSubmit,
    runDetachedTileShrinkReplacePop,
    scheduleSmallPlusBubbleOutro,
    sleep,
    nextTick,
  });
}

/**
 * @param {object} deps
 * @param {{ current: unknown }} deps.treasureLevelCompleteFxRef
 */
export function wireVolcanoEruptionFx(deps) {
  const {
    treasureLevelCompleteFxRef,
    treasureDestroyFxRef,
    ownedTreasures,
    grid,
    ROWS,
    COLS,
    treasureInventoryCtrl,
    ownedTreasureHasNoSellAccessory,
    isTreasureBarSlotVisible,
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    clearOwnedTreasureSlotLeaveGapAtIndex,
    scheduleRunAutoSave,
    touchGrid,
    nextTick,
    shopOverlayLayersSuppressed,
    scoreBubbleAnchorRect,
    getGridTileElByIndex,
    onVolcanoEruptionPlayed,
  } = deps;

  treasureLevelCompleteFxRef.current = createVolcanoEruptionRunner({
    treasureDestroyFxRef,
    ownedTreasures,
    grid,
    ROWS,
    COLS,
    getOwnedTreasureSlotEl: (ix) => treasureInventoryCtrl.getSlotElement(ix),
    getOwnedTreasureBubbleAnchorEl: (ix) => treasureInventoryCtrl.getBarFxEl(ix),
    getGridTileEl: (row, col) => getGridTileElByIndex(row * COLS + col),
    ownedTreasureHasNoSellAccessory,
    isTreasureBarSlotVisible,
    showScoreBubble,
    scheduleSmallPlusBubbleOutro,
    clearOwnedTreasureSlotLeaveGapAtIndex,
    scheduleRunAutoSave,
    touchGrid,
    nextTick,
    setShopOverlayLayersSuppressed: (v) => {
      shopOverlayLayersSuppressed.value = v;
    },
    scoreBubbleAnchorRect,
    onVolcanoEruptionPlayed,
  });
}

/**
 * 一次性接线 GamePanel 全部 FX 工厂（owned bar / destroy / hourglass / upgrade / submit leave）。
 * @param {object} d
 * @param {Parameters<typeof wireOwnedTreasureBarFx>[0]} d.ownedBar
 * @param {Parameters<typeof wireTreasureDestroyFx>[0]} d.destroy
 * @param {Parameters<typeof wireHourglassStageFx>[0]} d.hourglass
 * @param {Parameters<typeof wireInRunUpgradePlayback>[0]} d.inRunUpgrade
 * @param {Parameters<typeof wireSubmitTileLeaveAnim>[0]} d.submitLeave
 * @param {Parameters<typeof wireVolcanoEruptionFx>[0]} d.volcano
 */
export function wireAllGamePanelFx(d) {
  wireOwnedTreasureBarFx(d.ownedBar);
  wireTreasureDestroyFx(d.destroy);
  wireVolcanoEruptionFx(d.volcano);
  wireHourglassStageFx(d.hourglass);
  wireInRunUpgradePlayback(d.inRunUpgrade);
  wireSubmitTileLeaveAnim(d.submitLeave);
}
