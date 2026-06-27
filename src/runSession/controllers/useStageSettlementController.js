import { computed } from "vue";

/**
 * @param {Object} options
 * @param {import('vue').Ref<boolean>} options.showSettlement
 * @param {import('vue').Ref<boolean>} options.disableSettlementLayerAnim
 * @param {import('vue').Ref<any>} options.settlementSnapshot
 * @param {import('vue').Ref<number>} options.settlementPortalZ
 * @param {(event?: Event) => void} options.onSettlementContinue
 */
export function useStageSettlementController(options) {
  const portalStackStyle = computed(() =>
    options.settlementPortalZ.value > 0 ? { zIndex: options.settlementPortalZ.value } : undefined,
  );

  return {
    open: options.showSettlement,
    snapshot: options.settlementSnapshot,
    disableLayerAnim: options.disableSettlementLayerAnim,
    portalStackStyle,
    onContinue: options.onSettlementContinue,
  };
}
