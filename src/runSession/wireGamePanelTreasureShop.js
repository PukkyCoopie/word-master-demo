import { wireTreasureInventoryFromGamePanel } from "./controllers/useTreasureInventoryController.js";
import { wireShopTransactionFromGamePanel } from "./controllers/useShopTransactionController.js";

/**
 * GamePanel 侧：宝藏 inventory ↔ treasureRun 绑定 + 商店交易 controller。
 * @param {object} d
 * @param {ReturnType<import('./controllers/useTreasureInventoryController.js').useTreasureInventoryController>} d.treasureInventoryCtrl
 * @param {ReturnType<import('./controllers/useTreasureRunController.js').useTreasureRunController>} d.treasureRun
 * @param {{ ref: import('vue').Ref<boolean> | null }} d.gameOwnedDragMovedBridge
 * @param {ReturnType<import('./controllers/useShopPhaseController.js').useShopPhaseController>} d.shopPhase
 * @param {import('vue').Ref<object | null>} d.treasureDetail
 * @param {import('vue').Ref<number>} d.money
 * @param {import('vue').Ref<(object | null)[]>} d.ownedTreasures
 * @param {import('vue').Ref<string[]>} d.ownedVoucherIds
 * @param {import('vue').Ref<object>} d.treasureRunState
 * @param {() => (string | null)[]} d.ownedSlotTreasureIdList
 * @param {(spellId: string, counts: object) => boolean} d.canPurchaseSpellInShop
 * @param {(amount: number) => void} d.noteRunMoneySpent
 * @param {() => void} d.noteRunShopPurchase
 * @param {(vid: string) => void} d.noteCollectionVoucherAcquired
 * @param {() => void} d.scheduleRunAutoSave
 * @param {(treasure: object) => boolean} d.applyGlyphVoucherLevelSkip
 * @param {() => object} d.ownedTreasureHookFxBridge
 * @param {() => void} d.onVerdantTreasureSold
 * @param {() => unknown} d.getRunOverlayHost
 * @param {() => unknown} d.getShopPanel
 */
export function wireGamePanelTreasureShop(d) {
  wireTreasureInventoryFromGamePanel(
    d.treasureInventoryCtrl,
    d.treasureRun,
    d.gameOwnedDragMovedBridge,
  );
  const sp = d.shopPhase;
  const tr = d.treasureRun;
  return wireShopTransactionFromGamePanel({
    inventory: d.treasureInventoryCtrl,
    treasureDetail: d.treasureDetail,
    money: d.money,
    ownedTreasures: d.ownedTreasures,
    ownedVoucherIds: d.ownedVoucherIds,
    treasureRunState: d.treasureRunState,
    runWalletFloor: sp.runWalletFloor,
    ownedSlotTreasureIdList: d.ownedSlotTreasureIdList,
    applyTreasureAcquireImmediateEffectsForRun: tr.applyTreasureAcquireImmediateEffectsForRun,
    shopPriceForOffer: sp.shopPriceForOffer,
    clearOfferSlotAfterPurchase: sp.clearOfferSlotAfterPurchase,
    appendShopRandomCardSlotsAfterPurchase: sp.appendShopRandomCardSlotsAfterPurchase,
    isCouponDropSpellBlockedByBonusVoucher: sp.isCouponDropSpellBlockedByBonusVoucher,
    canPurchaseSpellInShop: d.canPurchaseSpellInShop,
    spellPoolEligibilityForShop: sp.spellPoolEligibilityForShop,
    buildUpgradeAnimPayloadFromOffer: sp.buildUpgradeAnimPayloadFromOffer,
    applyUpgradeFromOffer: sp.applyUpgradeFromOffer,
    runShopUpgradePlaybackSteps: sp.runShopUpgradePlaybackSteps,
    noteRunMoneySpent: d.noteRunMoneySpent,
    noteRunShopPurchase: d.noteRunShopPurchase,
    noteCollectionVoucherAcquired: d.noteCollectionVoucherAcquired,
    scheduleRunAutoSave: d.scheduleRunAutoSave,
    applyGlyphVoucherLevelSkip: d.applyGlyphVoucherLevelSkip,
    ownedTreasureHookFxBridge: d.ownedTreasureHookFxBridge,
    onVerdantTreasureSold: d.onVerdantTreasureSold,
    getRunOverlayHost: d.getRunOverlayHost,
    getShopPanel: d.getShopPanel,
  });
}
