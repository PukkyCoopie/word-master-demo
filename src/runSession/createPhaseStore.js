import { computed } from "vue";
import { createRunPhaseMachine } from "./runPhaseMachine.js";

/**
 * Vue 阶段机命名空间（`session.phase`）。
 *
 * @param {{
 *   transitionBusy: import('vue').Ref<boolean>,
 *   shopOverlayLayersSuppressed: import('vue').Ref<boolean>,
 *   getMachineInput: () => import('./runPhaseMachine.js').RunPhaseMachineInput,
 * }} deps
 */
export function createPhaseStore(deps) {
  const { transitionBusy, shopOverlayLayersSuppressed, getMachineInput } = deps;
  const machine = createRunPhaseMachine(getMachineInput);
  const snapshot = computed(() => machine.snapshot());

  return {
    snapshot,
    transitionBusy,
    shopOverlayLayersSuppressed,
    canSubmitWord: () => machine.canSubmitWord(),
    canOpenShop: () => machine.canOpenShop(),
    canPause: () => machine.canPause(),
    isRunFlowOverlayOpen: () => machine.isRunFlowOverlayOpen(),
    isBlockingPauseOpen: () => machine.isBlockingPauseOpen(),
    computeRunSaveIdle: () => machine.computeRunSaveIdle(),
    resolvePhaseId: () => machine.resolvePhaseId(),
    resolvePersistedPhase: () => machine.resolvePersistedPhase(),
  };
}
