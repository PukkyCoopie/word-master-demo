import { nextTick } from "vue";
import { animateTreasureFrameFly } from "../../game/shopOfferFlyAnim.js";
import { resolveShopPurchaseRoute } from "../../shop/shopPurchaseDispatch.js";
import {
  initTreasureBankOnAcquire,
  syncShopUpgradesFreeFromOwnedTreasures,
} from "../../treasures/treasureAcquireInit.js";
import { canAffordWallet } from "../../treasures/treasureWalletFloor.js";
import { readTreasureAccessoryIds } from "../../accessories/accessoryState.js";
import { ownedTreasureHasNoSellAccessory } from "../../game/runDifficultyRuntime.js";
import { computeOwnedTreasureSellRefund } from "../../treasures/ownedTreasureSlot.js";
import { notifyOwnedTreasuresOnTreasureSold } from "../../treasures/treasureRegistry.js";
import { getShopRandomCardSlotCount } from "../../shop/rollShopRandomCardStock.js";
import { getShopRandomCardSlotBonus } from "../../vouchers/voucherRuntime.js";

/**
 * @typedef {Object} ShopTransactionInventoryApi
 * @property {(offer: object | null) => number} findPlacementIndex
 * @property {(index: number, slot: object) => void} grantAt
 * @property {(excludeTreasureId?: string, targetSlotIndex?: number) => number} grantRandomCopy
 * @property {(soldIndex: number, soldSlot: object, copyGrantedAtSoldSlot: boolean) => boolean} applySellSlotState
 * @property {() => Promise<void>} triggerCompactAnim
 * @property {(slotIndex: number, opts?: object) => Promise<HTMLElement | null>} waitForSlotElement
 * @property {(slotIndex: number, opts?: object) => Promise<void>} playGrantPopAtSlot
 */

/**
 * 商店购买、出售编排（inventory 负责槽位授予与 bar DOM）。
 *
 * @param {Object} options
 * @param {ShopTransactionInventoryApi} options.inventory
 * @param {import('vue').Ref<object | null>} options.treasureDetail
 * @param {import('vue').Ref<number>} options.money
 * @param {import('vue').Ref<(object | null)[]>} options.ownedTreasures
 * @param {import('vue').Ref<string[]>} options.ownedVoucherIds
 * @param {import('vue').Ref<object>} options.treasureRunState
 * @param {import('vue').Ref<number>} options.runWalletFloor
 * @param {() => (string | null)[]} options.ownedSlotTreasureIdList
 * @param {(treasureId: string) => void} options.applyTreasureAcquireImmediateEffectsForRun
 * @param {(listPrice: number, offer: object) => number} options.shopPriceForOffer
 * @param {(offer: object) => void} options.clearOfferSlotAfterPurchase
 * @param {(count: number) => void} options.appendShopRandomCardSlotsAfterPurchase
 * @param {(spellId: string) => boolean} options.isCouponDropSpellBlockedByBonusVoucher
 * @param {(spellId: string, counts: object) => boolean} options.canPurchaseSpellInShop
 * @param {() => object} options.spellPoolEligibilityForShop
 * @param {(offer: object) => object} options.buildUpgradeAnimPayloadFromOffer
 * @param {(offer: object, opts?: object) => void} options.applyUpgradeFromOffer
 * @param {(steps: object[], opts?: object) => Promise<void>} options.runShopUpgradePlaybackSteps
 * @param {(amount: number) => void} options.noteRunMoneySpent
 * @param {() => void} options.noteRunShopPurchase
 * @param {(vid: string) => void} options.noteCollectionVoucherAcquired
 * @param {() => void} options.scheduleRunAutoSave
 * @param {(treasure: object) => void} [options.maybeEndShopTutorialOnTreasurePurchase]
 * @param {(vid: string) => boolean} options.applyGlyphVoucherLevelSkip
 * @param {() => object} options.ownedTreasureHookFxBridge
 * @param {() => void} options.onVerdantTreasureSold
 * @param {() => Promise<void>} [options.onBossKeySold]
 * @param {() => { treasureDetailLayerRef?: { playClose?: () => Promise<void>, getFlyFrameEl?: () => HTMLElement | null } } | null} options.getRunOverlayHost
 * @param {() => { playGlyphRoundInfoFx?: (msg: string) => void } | null} [options.getShopPanel]
 * @param {() => Promise<void>} [options.onPackInnerClaim]
 * @param {(offer: object, fromEl: HTMLElement | null) => Promise<void>} [options.fulfillPackInnerPurchase]
 * @param {(offer: object) => void} [options.openShopPackSession]
 * @param {() => boolean} [options.isSpellGrantDetailOpenGuardActive]
 * @param {() => string | null | undefined} [options.getSpellGrantDetailPendingPurchasedSpellId]
 * @param {() => Promise<void>} [options.fulfillSpellGrantDetailCast]
 * @param {() => Promise<void>} [options.fulfillStarSpellShopPurchase]
 * @param {(spellId: string, source: string, scope: string, meta: object) => Promise<void>} [options.runSpellPreviewChain]
 * @param {(fn: () => Promise<void>) => Promise<void>} [options.runSpellPreviewChainAfterDetailClose]
 */
export function useShopTransactionController(options) {
  const inventory = options.inventory;

  function getDetailLayer() {
    return options.getRunOverlayHost()?.treasureDetailLayerRef ?? null;
  }

  function syncShopUpgradesFromOwned() {
    syncShopUpgradesFreeFromOwnedTreasures(
      options.ownedSlotTreasureIdList(),
      options.treasureRunState.value,
    );
  }

  async function purchaseTreasure(t, pay, listPrice) {
    const slotsLenBefore = options.ownedTreasures.value.length;
    const ix = inventory.findPlacementIndex(t);
    if (ix < 0) return;

    initTreasureBankOnAcquire(t.treasureId, options.treasureRunState.value);
    options.applyTreasureAcquireImmediateEffectsForRun(t.treasureId);

    options.clearOfferSlotAfterPurchase(t);
    await nextTick();

    const layer = getDetailLayer();
    const fromEl = layer?.getFlyFrameEl?.();
    const slotsExpanded = options.ownedTreasures.value.length > slotsLenBefore;
    const toTargetPromise = inventory.waitForSlotElement(ix, { slotsExpanded });

    let grantedOnFly = false;
    const grantTreasure = () => {
      if (grantedOnFly) return;
      grantedOnFly = true;
      inventory.grantAt(ix, {
        treasureId: t.treasureId,
        price: listPrice,
        treasureAccessoryIds: readTreasureAccessoryIds(t),
      });
      syncShopUpgradesFromOwned();
    };

    const closePromise = layer?.playClose?.() ?? Promise.resolve();
    const toTarget = await toTargetPromise;
    const flyPromise =
      fromEl && toTarget
        ? animateTreasureFrameFly(fromEl, toTarget, {
            onLanding: grantTreasure,
            keepSourceHidden: true,
          })
        : Promise.resolve();

    await Promise.all([closePromise, flyPromise]);

    options.money.value -= pay;
    options.noteRunMoneySpent(pay);
    options.noteRunShopPurchase();
    if (!grantedOnFly) {
      grantTreasure();
      await inventory.playGrantPopAtSlot(ix);
    }
    options.maybeEndShopTutorialOnTreasurePurchase?.(t);
    options.treasureDetail.value = null;
  }

  async function purchaseSpellGrantFlow(detail) {
    if (options.isSpellGrantDetailOpenGuardActive?.()) return;
    const sid = String(
      detail.treasure?.spellId ?? options.getSpellGrantDetailPendingPurchasedSpellId?.() ?? "",
    );
    if (options.isCouponDropSpellBlockedByBonusVoucher(sid)) return;
    await options.fulfillSpellGrantDetailCast?.();
  }

  async function purchaseBundlePack(t, pay) {
    const layer = getDetailLayer();
    await layer?.playClose?.();
    options.money.value -= pay;
    options.noteRunMoneySpent(pay);
    options.noteRunShopPurchase();
    options.clearOfferSlotAfterPurchase(t);
    options.treasureDetail.value = null;
    options.openShopPackSession?.(t);
  }

  async function purchaseVoucher(t, pay) {
    const vid = String(t.voucherId ?? "");
    if (!vid) return;
    const layer = getDetailLayer();
    await layer?.playClose?.();
    options.money.value -= pay;
    options.noteRunMoneySpent(pay);
    options.noteRunShopPurchase();
    options.clearOfferSlotAfterPurchase(t);
    const slotCountBefore = getShopRandomCardSlotCount(
      getShopRandomCardSlotBonus(options.ownedVoucherIds.value),
    );
    options.ownedVoucherIds.value = [...options.ownedVoucherIds.value, vid];
    options.noteCollectionVoucherAcquired(vid);
    const slotsToAdd =
      getShopRandomCardSlotCount(getShopRandomCardSlotBonus(options.ownedVoucherIds.value)) -
      slotCountBefore;
    options.appendShopRandomCardSlotsAfterPurchase(slotsToAdd);
    if (options.applyGlyphVoucherLevelSkip(vid)) {
      void options.getShopPanel?.()?.playGlyphRoundInfoFx?.("-1大关");
    }
    options.treasureDetail.value = null;
  }

  async function purchaseDeckTile(t, pay) {
    const layer = getDetailLayer();
    const fromEl = layer?.getFlyFrameEl?.();
    await layer?.playClose?.();
    options.money.value -= pay;
    options.noteRunMoneySpent(pay);
    options.noteRunShopPurchase();
    options.clearOfferSlotAfterPurchase(t);
    options.treasureDetail.value = null;
    await options.fulfillPackInnerPurchase?.(t, fromEl ?? null);
  }

  async function purchaseSpell(t, pay) {
    const spellId = String(t.spellId ?? "");
    if (!spellId) return;
    if (!options.canPurchaseSpellInShop(spellId, options.spellPoolEligibilityForShop())) return;
    if (options.isCouponDropSpellBlockedByBonusVoucher(spellId)) return;
    options.money.value -= pay;
    options.noteRunMoneySpent(pay);
    options.noteRunShopPurchase();
    options.clearOfferSlotAfterPurchase(t);
    const spellMeta = {
      spellDescription: t.description,
      spellName: t.name,
      spellIconClass: t.iconClass,
      spellRarity: t.rarity,
    };
    if (spellId === "dice" || spellId === "restart") {
      await getDetailLayer()?.playClose?.();
      options.treasureDetail.value = null;
      await nextTick();
      await new Promise((r) => requestAnimationFrame(r));
      await options.runSpellPreviewChain?.(spellId, "shop", "fullDeck", spellMeta);
      return;
    }
    if (spellId === "star") {
      await options.fulfillStarSpellShopPurchase?.();
      return;
    }
    await options.runSpellPreviewChainAfterDetailClose?.(() =>
      options.runSpellPreviewChain?.(spellId, "shop", "fullDeck", spellMeta),
    );
  }

  async function purchaseUpgrade(t, pay) {
    const layer = getDetailLayer();
    await layer?.playClose?.();
    options.money.value -= pay;
    options.noteRunMoneySpent(pay);
    options.noteRunShopPurchase();
    options.clearOfferSlotAfterPurchase(t);
    options.treasureDetail.value = null;
    const payload = options.buildUpgradeAnimPayloadFromOffer(t);
    await options.runShopUpgradePlaybackSteps(
      [
        {
          payload,
          apply: () => options.applyUpgradeFromOffer(t, { price: pay }),
        },
      ],
      { restoreLayersAfter: false },
    );
  }

  async function purchase() {
    const d = options.treasureDetail.value;
    if (!d) return;
    try {
      const route = resolveShopPurchaseRoute(d);
      if (route.route === "spellGrantFlow") {
        await purchaseSpellGrantFlow(d);
        return;
      }
      if (route.route === "packInner") {
        await options.onPackInnerClaim?.();
        return;
      }
      if (route.route !== "offer") return;

      const t = d.treasure;
      const listPrice = Math.max(0, Math.floor(Number(t.price) || 0));
      const pay = options.shopPriceForOffer(listPrice, t);

      if (route.handler === "bundlePack") {
        if (!canAffordWallet(options.money.value, pay, options.runWalletFloor.value)) return;
        await purchaseBundlePack(t, pay);
        return;
      }

      if (!canAffordWallet(options.money.value, pay, options.runWalletFloor.value)) return;

      switch (route.handler) {
        case "voucher":
          await purchaseVoucher(t, pay);
          break;
        case "deckTile":
          await purchaseDeckTile(t, pay);
          break;
        case "spell":
          await purchaseSpell(t, pay);
          break;
        case "upgrade":
          await purchaseUpgrade(t, pay);
          break;
        case "treasure":
          await purchaseTreasure(t, pay, listPrice);
          break;
        default:
          break;
      }
    } finally {
      options.scheduleRunAutoSave();
    }
  }

  async function sell() {
    const d = options.treasureDetail.value;
    if (!d || d.kind !== "owned") return;
    const ix = d.slotIndex;
    const cur = options.ownedTreasures.value[ix];
    if (!cur) return;
    if (ownedTreasureHasNoSellAccessory(cur)) return;

    await getDetailLayer()?.playClose?.();
    options.money.value += computeOwnedTreasureSellRefund(cur);
    const soldId = String(cur.treasureId ?? "");
    let copyGrantedAtSoldSlot = false;
    let copyGrantedSlotIndex = -1;
    await notifyOwnedTreasuresOnTreasureSold(options.ownedSlotTreasureIdList(), {
      ownedSlotTreasureIds: options.ownedSlotTreasureIdList(),
      treasureRun: options.treasureRunState.value,
      soldTreasureId: soldId,
      soldSlotIndex: ix,
      grantRandomTreasureCopy: (targetSlotIndex = ix) => {
        copyGrantedSlotIndex = inventory.grantRandomCopy("104", targetSlotIndex);
        copyGrantedAtSoldSlot = copyGrantedSlotIndex >= 0;
        return copyGrantedAtSoldSlot;
      },
      ...options.ownedTreasureHookFxBridge(),
    });
    if (copyGrantedSlotIndex >= 0) {
      await inventory.playGrantPopAtSlot(copyGrantedSlotIndex);
    }
    inventory.applySellSlotState(ix, cur, copyGrantedAtSoldSlot);
    void inventory.triggerCompactAnim();
    syncShopUpgradesFromOwned();
    options.treasureDetail.value = null;
    options.onVerdantTreasureSold();
    if (soldId === "136") {
      await options.onBossKeySold?.();
    }
    options.scheduleRunAutoSave();
  }

  function bindPostAssemblyCallbacks(callbacks) {
    if (callbacks.onPackInnerClaim) options.onPackInnerClaim = callbacks.onPackInnerClaim;
    if (callbacks.fulfillPackInnerPurchase) {
      options.fulfillPackInnerPurchase = callbacks.fulfillPackInnerPurchase;
    }
    if (callbacks.openShopPackSession) options.openShopPackSession = callbacks.openShopPackSession;
    if (callbacks.isSpellGrantDetailOpenGuardActive) {
      options.isSpellGrantDetailOpenGuardActive = callbacks.isSpellGrantDetailOpenGuardActive;
    }
    if (callbacks.getSpellGrantDetailPendingPurchasedSpellId) {
      options.getSpellGrantDetailPendingPurchasedSpellId =
        callbacks.getSpellGrantDetailPendingPurchasedSpellId;
    }
    if (callbacks.fulfillSpellGrantDetailCast) {
      options.fulfillSpellGrantDetailCast = callbacks.fulfillSpellGrantDetailCast;
    }
    if (callbacks.fulfillStarSpellShopPurchase) {
      options.fulfillStarSpellShopPurchase = callbacks.fulfillStarSpellShopPurchase;
    }
    if (callbacks.runSpellPreviewChain) {
      options.runSpellPreviewChain = callbacks.runSpellPreviewChain;
    }
    if (callbacks.runSpellPreviewChainAfterDetailClose) {
      options.runSpellPreviewChainAfterDetailClose = callbacks.runSpellPreviewChainAfterDetailClose;
    }
    if (callbacks.maybeEndShopTutorialOnTreasurePurchase) {
      options.maybeEndShopTutorialOnTreasurePurchase =
        callbacks.maybeEndShopTutorialOnTreasurePurchase;
    }
  }

  return {
    purchase,
    sell,
    bindPostAssemblyCallbacks,
  };
}

/**
 * GamePanel 侧：实例化商店交易 controller（shopPhase 回调由 deps 注入）。
 * @param {Parameters<typeof useShopTransactionController>[0]} deps
 */
export function wireShopTransactionFromGamePanel(deps) {
  return useShopTransactionController(deps);
}

/**
 * assembly 后补绑 pack/spell 购买回调。
 * @param {ReturnType<typeof useShopTransactionController>} ctrl
 * @param {Parameters<ReturnType<typeof useShopTransactionController>['bindPostAssemblyCallbacks']>[0]} callbacks
 */
export function wireShopTransactionPostAssembly(ctrl, callbacks) {
  ctrl.bindPostAssemblyCallbacks(callbacks);
}
