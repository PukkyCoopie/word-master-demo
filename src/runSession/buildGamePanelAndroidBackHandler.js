import { handleGameAndroidBack } from "../platform/handleGameAndroidBack.js";

/**
 * @param {Parameters<typeof handleGameAndroidBack>[0] & {
 *   treasureDetail: import('vue').Ref<unknown>,
 *   onTreasureDetailClose: () => void,
 *   runOverlayHostRef: import('vue').Ref<{ treasureDetailLayerRef?: { playClose?: () => Promise<void> } } | null>,
 * }} ctx
 */
export function buildGamePanelAndroidBackHandler(ctx) {
  const {
    treasureDetail,
    onTreasureDetailClose,
    runOverlayHostRef,
    ...backCtx
  } = ctx;

  async function dismissTreasureDetailOnBack() {
    if (!treasureDetail.value) return;
    if (treasureDetail.value.spellGrantFlow === true) {
      onTreasureDetailClose();
      return;
    }
    const layer = runOverlayHostRef.value?.treasureDetailLayerRef;
    if (layer?.playClose) {
      await layer.playClose();
    }
    onTreasureDetailClose();
  }

  function handleAndroidBack() {
    return handleGameAndroidBack({
      ...backCtx,
      dismissTreasureDetail: dismissTreasureDetailOnBack,
    });
  }

  return { handleAndroidBack };
}
