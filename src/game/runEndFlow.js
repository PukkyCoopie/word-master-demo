import { watch } from "vue";
import { LEVELS, RUN_START_LEVEL_INDEX, isStandardRunFinalLevelIndex } from "../levelDefinitions.js";
import {
  reportAverageWordLengthOnWin,
  reportDifficultyAchievedLeaderboard,
} from "../taptap/tapTapLeaderboardSync.js";

/**
 * @param {number} levelIndex
 * @returns {string[]}
 */
export function getCompletedLevelIdsForWin(levelIndex) {
  const idx = Math.max(0, Math.floor(Number(levelIndex) || 0));
  /** @type {string[]} */
  const ids = [];
  for (let i = RUN_START_LEVEL_INDEX; i <= idx && i < LEVELS.length; i++) {
    ids.push(LEVELS[i].id);
  }
  return ids;
}

/**
 * @param {Object} deps
 * @param {import('vue').Ref<boolean>} deps.showRunEnd
 * @param {import('vue').Ref<'fail' | 'win'>} deps.runEndOutcome
 * @param {import('vue').Ref<number>} deps.runEndPortalZ
 * @param {() => number} deps.bumpOverlayZ
 * @param {import('vue').Ref<boolean>} deps.showDeckLayer
 * @param {import('vue').Ref<boolean>} deps.showShop
 * @param {import('vue').Ref<boolean>} deps.showSettlement
 * @param {import('vue').Ref<boolean>} deps.showPauseOptions
 * @param {import('vue').Ref<unknown | null>} deps.settlementSnapshot
 * @param {import('vue').Ref<boolean>} deps.isEndlessRun
 * @param {import('vue').Ref<number>} deps.levelIndex
 * @param {import('vue').Ref<number>} deps.runDifficultyIndex
 * @param {import('vue').Ref<import('./runMatchStats.js').RunMatchStats>} deps.runMatchStats
 * @param {import('vue').Ref<string>} deps.runPresetId
 * @param {() => void} deps.dismissTileDetailLayer
 * @param {() => void} deps.clearRunEndOverlays
 * @param {(kind: string) => void} deps.triggerHaptic
 * @param {(overrides?: object) => void} deps.flushAchievementUnlocks
 * @param {(payload: object) => void} [deps.mergeCareerOnRunEnd]
 * @param {() => import('./runCollectionDiscoveries.js').RunDiscoveryLog | null | undefined} [deps.getRunDiscoveryLog]
 * @param {() => void} deps.scheduleRunAutoSave
 * @param {(opts?: object) => void} deps.requestCloudSync
 * @param {() => { tryFlush?: (opts?: object) => void }} deps.getSaveBridge
 * @param {(slotIndex: number) => void} deps.clearSlotRunProgress
 * @param {number} deps.saveSlotIndex
 * @param {() => void} deps.emitExitToMenu
 * @param {typeof import('vue').nextTick} deps.nextTick
 * @param {() => { triggerConfettiWin?: () => void, disposeConfetti?: () => void } | null} deps.getRunEndFlowHost
 */
export function createRunEndFlow(deps) {
  watch(deps.showRunEnd, (open) => {
    if (open) {
      deps.runEndPortalZ.value = deps.bumpOverlayZ();
      deps.showDeckLayer.value = false;
      void deps.dismissTileDetailLayer();
      deps.showShop.value = false;
      void deps.nextTick(() => {
        if (deps.runEndOutcome.value === "win") {
          deps.getRunEndFlowHost()?.triggerConfettiWin?.();
        }
      });
    } else {
      deps.getRunEndFlowHost()?.disposeConfetti?.();
    }
  });

  /**
   * @param {'fail' | 'win'} outcome
   * @param {{ preserveSettlement?: boolean }} [opts]
   */
  async function openRunEnd(outcome, opts = {}) {
    const won = outcome === "win";
    deps.triggerHaptic(won ? "success" : "warning");
    if (won) {
      deps.flushAchievementUnlocks({
        runWon: true,
        completedLevelIds: getCompletedLevelIdsForWin(deps.levelIndex.value),
      });
    }
    deps.runEndOutcome.value = won ? "win" : "fail";
    if (won) {
      reportAverageWordLengthOnWin(deps.runMatchStats.value);
      reportDifficultyAchievedLeaderboard(deps.runDifficultyIndex.value);
    }
    deps.mergeCareerOnRunEnd?.({
      outcome: deps.runEndOutcome.value,
      stats: deps.runMatchStats.value,
      runPresetId: deps.runPresetId.value,
      runDifficultyIndex: deps.runDifficultyIndex.value,
      runDiscoveryLog: deps.getRunDiscoveryLog?.() ?? null,
    });
    deps.clearRunEndOverlays();
    deps.showSettlement.value = false;
    if (!opts.preserveSettlement) deps.settlementSnapshot.value = null;
    deps.runEndPortalZ.value = deps.bumpOverlayZ();
    deps.showRunEnd.value = true;
    await deps.nextTick();
    deps.scheduleRunAutoSave();
    deps.requestCloudSync({ priority: "high" });
  }

  function shouldAbandonStandardWinAtMenu() {
    return (
      deps.showRunEnd.value &&
      deps.runEndOutcome.value === "win" &&
      !deps.isEndlessRun.value &&
      isStandardRunFinalLevelIndex(deps.levelIndex.value)
    );
  }

  function abandonStandardWinRunProgressIfNeeded() {
    if (!shouldAbandonStandardWinAtMenu()) return;
    deps.clearSlotRunProgress(deps.saveSlotIndex);
  }

  function onRunEndMainMenu() {
    deps.getSaveBridge()?.tryFlush?.({ force: true });
    deps.requestCloudSync({ priority: "high" });
    abandonStandardWinRunProgressIfNeeded();
    deps.emitExitToMenu();
  }

  return {
    openRunEnd,
    onRunEndMainMenu,
    shouldAbandonStandardWinAtMenu,
    abandonStandardWinRunProgressIfNeeded,
  };
}
