import { ref } from "vue";

/**
 * 局内信息弹层（关卡 / 稀有度 / 阶段 / 优惠券 tab）（R7）。
 *
 * @param {{
 *   isRunFlowOverlayOpen: () => boolean,
 *   firstWordTutorialActive: import('vue').Ref<boolean>,
 * }} deps
 */
export function useGamePanelInfoModal(deps) {
  const { isRunFlowOverlayOpen, firstWordTutorialActive } = deps;

  const showInfoLayer = ref(false);
  const infoModalInitialTab = ref("level");

  /** @param {'level' | 'rarity' | 'stage' | 'coupon'} [tab='level'] */
  function openInfoModal(tab = "level") {
    if (firstWordTutorialActive.value) return;
    if (isRunFlowOverlayOpen()) return;
    infoModalInitialTab.value = tab;
    showInfoLayer.value = true;
  }

  return {
    showInfoLayer,
    infoModalInitialTab,
    openInfoModal,
  };
}
