import { computed } from "vue";
import { createRunEndFlow } from "../../game/runEndFlow.js";

/**
 * @param {object} options
 * @param {import('vue').Ref<boolean>} options.showRunEnd
 * @param {import('vue').Ref<'fail' | 'win'>} options.runEndOutcome
 * @param {import('vue').Ref<number>} options.runEndPortalZ
 * @param {import('vue').Ref<import('../../game/runMatchStats.js').RunMatchStats>} options.runMatchStats
 * @param {import('vue').Ref<import('../../game/runCollectionDiscoveries.js').RunDiscoveryLog>} options.runDiscoveryLog
 * @param {import('vue').Ref<number>} options.runDifficultyIndex
 * @param {() => string} options.getRunSeedDisplay
 * @param {() => string} options.getReachedLevelId
 * @param {() => void} options.onRetry
 * @param {() => void | Promise<void>} options.onEnterEndless
 * @param {(payload: object) => void} options.onSelectDiscovery
 * @param {() => { triggerConfettiWin?: () => void, disposeConfetti?: () => void } | null} options.getRunEndFlowHost
 * @param {Parameters<typeof createRunEndFlow>[0]} options.flowDeps createRunEndFlow 其余 deps（不含 showRunEnd / runEndOutcome / runEndPortalZ / bumpOverlayZ / getRunEndFlowHost）
 */
export function useRunEndFlowController(options) {
  const {
    showRunEnd,
    runEndOutcome,
    runEndPortalZ,
    runMatchStats,
    runDiscoveryLog,
    runDifficultyIndex,
    getRunSeedDisplay,
    getReachedLevelId,
    onRetry,
    onEnterEndless,
    onSelectDiscovery,
    getRunEndFlowHost,
    flowDeps,
  } = options;

  const portalStackStyle = computed(() =>
    runEndPortalZ.value > 0 ? { zIndex: runEndPortalZ.value } : undefined,
  );

  const reachedLevelId = computed(() => getReachedLevelId());
  const runSeedDisplay = computed(() => getRunSeedDisplay());

  const flow = createRunEndFlow({
    ...flowDeps,
    showRunEnd,
    runEndOutcome,
    runEndPortalZ,
    getRunEndFlowHost,
  });

  return {
    open: showRunEnd,
    outcome: runEndOutcome,
    portalStackStyle,
    runMatchStats,
    runDiscoveryLog,
    reachedLevelId,
    runDifficultyIndex,
    runSeedDisplay,
    onRetry,
    onMainMenu: flow.onRunEndMainMenu,
    onEnterEndless,
    onSelectDiscovery,
    openRunEnd: flow.openRunEnd,
    abandonStandardWinRunProgressIfNeeded: flow.abandonStandardWinRunProgressIfNeeded,
    shouldAbandonStandardWinAtMenu: flow.shouldAbandonStandardWinAtMenu,
  };
}
