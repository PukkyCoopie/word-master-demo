import {
  bindLevelEndBeatState,
  resetLevelEndAnimSpeedProvider,
  setLevelEndAnimSpeedProvider,
} from "./levelEndAnimSpeed.js";
import {
  createLevelEndBeatState,
  estimateLevelCompleteHookBeatWeight,
  estimateLevelEndAnimBeats,
} from "./levelEndTiming.js";

/**
 * 小关达标 → 结算层之前：沙漏 tick + 宝藏 onLevelComplete，带与拼词计分同形的渐进加速。
 * @param {{
 *   getOwnedTreasures: () => (Record<string, unknown> | null)[],
 *   getOwnedSlotTreasureIds: () => (string | null | undefined)[],
 *   buildLevelCompleteHookEstimateCtx: () => import('../treasures/treasureTypes.js').TreasureLevelCompleteContext,
 *   runHourglassStageEndFx: (opts?: { onBeforeEachTick?: () => void | Promise<void> }) => Promise<void>,
 *   runTreasureLevelCompleteHooks: (opts?: {
 *     onBeforeEachHook?: (entry: { slotIndex: number, treasureId: string, source: 'self' | 'blueprint' }) => void | Promise<void>,
 *   }) => Promise<void>,
 * }} deps
 */
export async function runLevelEndPreSettlementFx(deps) {
  const ownedSlots = deps.getOwnedTreasures();
  const ownedIds = deps.getOwnedSlotTreasureIds();
  const estimateCtx = deps.buildLevelCompleteHookEstimateCtx();
  const { hourglassBeats, hookBeats } = estimateLevelEndAnimBeats(ownedSlots, ownedIds, estimateCtx);
  const beatState = createLevelEndBeatState(hourglassBeats, hookBeats);

  bindLevelEndBeatState(beatState);
  setLevelEndAnimSpeedProvider(() => beatState.currentSpeed);

  try {
    await deps.runHourglassStageEndFx({
      onBeforeEachTick: () => {
        beatState.advanceBeat();
      },
    });
    await deps.runTreasureLevelCompleteHooks({
      onBeforeEachHook: (entry) => {
        const weight = estimateLevelCompleteHookBeatWeight(entry.treasureId, estimateCtx);
        for (let i = 0; i < weight; i += 1) {
          beatState.advanceBeat();
        }
      },
    });
  } finally {
    resetLevelEndAnimSpeedProvider();
  }
}
