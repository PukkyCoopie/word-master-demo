<script setup>
import { inject, provide, ref } from "vue";
import { RUN_SESSION_KEY } from "../../runSession/useRunSession.js";
import { SHOP_VIEW_KEY } from "./shopViewKey.js";
import ShopPanel from "../ShopPanel.vue";
import "../../../css/game.shop-phase.css";

/** @type {import('../../runSession/runSessionTypes.js').RunSession} */
const session = inject(RUN_SESSION_KEY);
if (!session?.shop?.buildViewContext) {
  throw new Error("InRunShopPhase: session.shop.buildViewContext missing");
}
/** @type {import('./shopViewKey.js').ShopViewContext} */
const sv = session.shop.buildViewContext();
provide(SHOP_VIEW_KEY, sv);

const treasures = session.treasures;
const shopPanelRef = ref(null);

defineExpose({
  getWalletEl: () => shopPanelRef.value?.getWalletEl?.() ?? null,
  getOwnedSlotEl: (i) => shopPanelRef.value?.getOwnedSlotEl?.(i) ?? null,
  getTreasureBarExpandBtnEl: () => shopPanelRef.value?.getTreasureBarExpandBtnEl?.() ?? null,
  getDeckViewBtnEl: () => shopPanelRef.value?.getDeckViewBtnEl?.() ?? null,
  playGlyphRoundInfoFx: (...args) => shopPanelRef.value?.playGlyphRoundInfoFx?.(...args),
  playUpgradeResult: (...args) => shopPanelRef.value?.playUpgradeResult?.(...args),
  playVoucherBonusEnterAnim: (...args) => shopPanelRef.value?.playVoucherBonusEnterAnim?.(...args),
  shopPanelRef,
});
</script>

<template>
  <Teleport defer to="#game-view-portal-frame">
    <div class="portal-overlay-fill shop-portal-root" :style="sv.shopPortalStackStyle">
      <ShopPanel
        ref="shopPanelRef"
        :wallet-amount="sv.walletHeaderShown"
        :shop-offers="sv.shopOffers"
        :pack-offers="sv.packOffers"
        :voucher-slot="sv.shopVoucherShelfResolved"
        :voucher-bonus-slot="sv.shopVoucherBonusShelf"
        :owned-voucher-ids="sv.ownedVoucherIds"
        :owned-treasures="sv.ownedTreasures"
        :shop-reroll-cost="sv.shopNextRerollCostDisplay"
        :can-shop-reroll="sv.shopCanReroll"
        :interactions-disabled="sv.shopInteractionsDisabled"
        :treasure-charge-by-slot="sv.treasureChargeVisualBySlot"
        :treasure-charge-progress-by-slot="sv.treasureChargeProgressBySlot"
        :treasure-effect-depleted-by-slot="sv.treasureEffectDepletedBySlot"
        :treasure-slots-layout-class="sv.treasureSlotsLayoutClass"
        :treasure-bar-compact-animating="sv.treasureBarCompactAnimating"
        :treasure-bar-expand-btn-highlight="sv.treasureBarExpandBtnHighlight"
        :owned-treasure-key-order-bag="treasures.gameOwnedKeyOrderBag"
        :tutorial-active="sv.firstWordTutorialActive"
        :shop-tutorial-intro-active="sv.firstWordTutorialPhase === 'shopIntro'"
        :shop-tutorial-target-treasure-id="sv.shopTutorialTargetTreasureId"
        :run-preset-id="sv.runPresetId"
        :shop-upgrades-free="sv.treasureRunState.shopUpgradesFree"
        :wallet-floor="sv.walletFloor"
        :next-level-id="sv.nextLevelId"
        @open-treasure-collection="sv.openTreasureCollectionLayer"
        @open-options="sv.openPauseOptionsFromShop"
        @view-deck="sv.openDeckLayer"
        @view-round-info="sv.openInfoModalLevel"
        @view-stage-info="sv.openInfoModalStage"
        @next-level="sv.onShopNextLevel"
        @shop-reroll="sv.onShopReroll"
        @select-offer="sv.onShopSelectOffer"
        @select-pack-offer="sv.onShopSelectPackOffer"
        @select-voucher="sv.onShopSelectPackOffer"
        @select-owned="sv.onShopSelectOwned"
        @reorder-owned="sv.onShopReorderOwned"
        @upgrade-interaction-unlock="sv.onShopUpgradeInteractionUnlock"
      />
    </div>
  </Teleport>
</template>
