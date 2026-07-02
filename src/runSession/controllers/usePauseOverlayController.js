import { computed, ref } from "vue";

/**
 * @param {Object} options
 * @param {import('vue').Ref<boolean>} options.transitionBusy
 * @param {import('vue').Ref<boolean>} options.showShop
 * @param {import('vue').Ref<boolean>} options.showInfoLayer
 * @param {import('vue').Ref<any>} options.treasureDetail
 * @param {import('vue').Ref<any>} options.tileDetailPayload
 * @param {() => void} options.closeDeckLayer
 * @param {() => boolean} options.isBlockingPauseOpen
 * @param {() => boolean} options.isFirstWordTutorialBlockingInput
 * @param {() => void} options.openPauseOptionsPortal
 * @param {() => number} options.bumpOverlayZ
 * @param {() => number} [options.getShopPortalZ]
 * @param {() => void} [options.requestNewRun]
 * @param {() => void} [options.openSettings]
 * @param {() => void} [options.beforeMainMenuExit]
 * @param {() => void} [options.emitExitToMenu]
 * @param {(outcome: 'fail' | 'win', opts?: object) => void | Promise<void>} [options.openRunEnd]
 */
export function usePauseOverlayController(options) {
  const showPauseOptions = ref(false);
  const showDeveloperOptions = ref(false);
  /** @type {import('vue').Ref<{ reportConvertResult?: Function, reportGrantResult?: Function, reportBalanceResult?: Function, reportBossShopJumpResult?: Function, closeTreasurePicker?: Function, isTreasurePickerOpen?: () => boolean } | null>} */
  const developerOptionsLayerRef = ref(null);
  const developerOptionsPortalZ = ref(0);

  const developerOptionsPortalStackStyle = computed(() =>
    developerOptionsPortalZ.value > 0 ? { zIndex: developerOptionsPortalZ.value } : undefined,
  );

  const gamePauseOverlayOpen = computed(
    () => showPauseOptions.value || showDeveloperOptions.value,
  );

  function revealPauseOptionsLayer() {
    options.closeDeckLayer();
    options.showInfoLayer.value = false;
    options.treasureDetail.value = null;
    options.tileDetailPayload.value = null;
    options.openPauseOptionsPortal();
    showPauseOptions.value = true;
  }

  function openPauseOptions() {
    if (options.isFirstWordTutorialBlockingInput()) return;
    if (options.transitionBusy.value || options.showShop.value || options.isBlockingPauseOpen()) return;
    revealPauseOptionsLayer();
  }

  function openPauseOptionsFromShop() {
    if (options.transitionBusy.value || !options.showShop.value || options.isBlockingPauseOpen()) return;
    revealPauseOptionsLayer();
  }

  function closePauseOptions() {
    showPauseOptions.value = false;
  }

  function closeDeveloperOptions() {
    showDeveloperOptions.value = false;
  }

  function resolveDeveloperOptionsPortalZ() {
    const shopZ = Math.max(0, Math.floor(Number(options.getShopPortalZ?.() ?? 0) || 0));
    let z = options.bumpOverlayZ();
    while (shopZ > 0 && z <= shopZ) {
      z = options.bumpOverlayZ();
    }
    return z;
  }

  function onPauseDeveloperOptions() {
    showPauseOptions.value = false;
    developerOptionsPortalZ.value = resolveDeveloperOptionsPortalZ();
    showDeveloperOptions.value = true;
  }

  function onDeveloperOptionsClose() {
    closeDeveloperOptions();
  }

  function onPauseContinue() {
    closePauseOptions();
  }

  function onPauseNewRun() {
    options.requestNewRun?.();
  }

  function onPauseSettings() {
    closePauseOptions();
    options.openSettings?.();
  }

  function onPauseMainMenu() {
    closePauseOptions();
    options.beforeMainMenuExit?.();
    options.emitExitToMenu?.();
  }

  async function onPauseEndGame() {
    closePauseOptions();
    await options.openRunEnd?.("fail");
  }

  return {
    showPauseOptions,
    showDeveloperOptions,
    developerOptionsLayerRef,
    developerOptionsPortalStackStyle,
    gamePauseOverlayOpen,
    openPauseOptions,
    openPauseOptionsFromShop,
    closePauseOptions,
    closeDeveloperOptions,
    onPauseDeveloperOptions,
    onDeveloperOptionsClose,
    onPauseContinue,
    onPauseNewRun,
    onPauseSettings,
    onPauseMainMenu,
    onPauseEndGame,
  };
}
