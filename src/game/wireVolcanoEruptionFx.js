import { runVolcanoEruptionFx } from "./volcanoEruptionFx.js";

/**
 * 关卡完成：火山喷发 FX 接线。
 * @param {{
 *   treasureDestroyFxRef: { current: { wobbleTreasureSlotWithDestroyBubbleConcurrent?: Function, shrinkTreasureSlotElOnly?: Function } | null },
 *   ownedTreasures: import('vue').Ref<(object | null)[]>,
 *   grid: import('vue').ShallowRef<Record<string, unknown>[][]>,
 *   ROWS: number,
 *   COLS: number,
 *   getOwnedTreasureSlotEl: (slotIndex: number) => HTMLElement | null | undefined,
 *   getOwnedTreasureBubbleAnchorEl: (slotIndex: number) => HTMLElement | null | undefined,
 *   getGridTileEl: (row: number, col: number) => HTMLElement | undefined,
 *   ownedTreasureHasNoSellAccessory: (slot: object | null | undefined) => boolean,
 *   isTreasureBarSlotVisible: (slotIndex: number) => boolean,
 *   showScoreBubble: (...args: unknown[]) => HTMLElement | null,
 *   scheduleSmallPlusBubbleOutro: (bubble: HTMLElement | null | undefined, speed?: number) => void,
 *   clearOwnedTreasureSlotLeaveGapAtIndex: (slotIndex: number) => void,
 *   scheduleRunAutoSave: () => void,
 *   touchGrid: () => void,
 *   nextTick: () => Promise<void>,
 *   setShopOverlayLayersSuppressed: (v: boolean) => void,
 *   scoreBubbleAnchorRect: (slotEl: unknown) => DOMRect | null,
 *   onVolcanoEruptionPlayed?: () => void,
 * }} deps
 */
export function createVolcanoEruptionRunner(deps) {
  return {
    async playVolcanoEruptionAtSlot(volcanoSlotIndex) {
      deps.onVolcanoEruptionPlayed?.();

      const destroyFx = deps.treasureDestroyFxRef.current;
      const wobbleFn = destroyFx?.wobbleTreasureSlotWithDestroyBubbleConcurrent;
      const shrinkFn = destroyFx?.shrinkTreasureSlotElOnly;
      if (!wobbleFn || !shrinkFn) return;

      await runVolcanoEruptionFx({
        volcanoSlotIndex,
        ownedTreasures: deps.ownedTreasures.value,
        grid: deps.grid,
        ROWS: deps.ROWS,
        COLS: deps.COLS,
        getOwnedTreasureSlotEl: deps.getOwnedTreasureSlotEl,
        getOwnedTreasureBubbleAnchorEl: deps.getOwnedTreasureBubbleAnchorEl,
        getGridTileEl: deps.getGridTileEl,
        isOwnedTreasureSlotNoSell: (ix) =>
          deps.ownedTreasureHasNoSellAccessory(deps.ownedTreasures.value[ix]),
        isTreasureBarSlotVisible: deps.isTreasureBarSlotVisible,
        showScoreBubble: deps.showScoreBubble,
        scheduleSmallPlusBubbleOutro: deps.scheduleSmallPlusBubbleOutro,
        wobbleTreasureSlotWithDestroyBubbleConcurrent: wobbleFn,
        shrinkTreasureSlotElOnly: shrinkFn,
        clearOwnedTreasureSlotLeaveGapAtIndex: deps.clearOwnedTreasureSlotLeaveGapAtIndex,
        scheduleRunAutoSave: deps.scheduleRunAutoSave,
        touchGrid: deps.touchGrid,
        nextTick: deps.nextTick,
        setShopOverlayLayersSuppressed: deps.setShopOverlayLayersSuppressed,
        scoreBubbleAnchorRect: deps.scoreBubbleAnchorRect,
      });
    },
  };
}
