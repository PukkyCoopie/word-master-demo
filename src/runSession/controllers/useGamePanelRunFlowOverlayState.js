import { computed, ref } from "vue";

/**
 * 小关结算 / 整局结束层与 portal z-index 栈（R7）。
 *
 * @param {{ settlementLayerRef: import('vue').Ref<{ isIntroPending?: () => boolean, finishIntroInstant?: () => boolean } | null> }} deps
 */
export function useGamePanelRunFlowOverlayState(deps) {
  const { settlementLayerRef } = deps;

  const shopPortalZ = ref(0);
  const settlementPortalZ = ref(0);
  const runEndPortalZ = ref(0);

  const shopPortalStackStyle = computed(() =>
    shopPortalZ.value > 0 ? { zIndex: shopPortalZ.value } : undefined,
  );
  const settlementPortalStackStyle = computed(() =>
    settlementPortalZ.value > 0 ? { zIndex: settlementPortalZ.value } : undefined,
  );

  const showRunEnd = ref(false);
  /** @type {import('vue').Ref<'fail' | 'win'>} */
  const runEndOutcome = ref("fail");

  const showSettlement = ref(false);
  const disableSettlementLayerAnim = ref(false);
  /** @type {import('vue').Ref<null | { clearReward: number, spareMoves: number, interest: number, total: number, moneyBefore: number }>} */
  const settlementSnapshot = ref(null);

  function settlementIntroPending() {
    return !!settlementLayerRef.value?.isIntroPending?.();
  }

  function finishSettlementIntroInstant() {
    return settlementLayerRef.value?.finishIntroInstant?.() ?? false;
  }

  return {
    shopPortalZ,
    settlementPortalZ,
    runEndPortalZ,
    shopPortalStackStyle,
    settlementPortalStackStyle,
    showRunEnd,
    runEndOutcome,
    showSettlement,
    disableSettlementLayerAnim,
    settlementSnapshot,
    settlementIntroPending,
    finishSettlementIntroInstant,
  };
}
