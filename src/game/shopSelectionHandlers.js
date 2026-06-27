import { createPreviewNavGroupFromItems } from "../preview/previewGroupNav.js";
import { offerFlyOriginRectFromEl, packDeckOfferFlyOriginRectFromEl } from "./offerFlyOrigin.js";

/**
 * @typedef {Object} ShopSelectionHandlersDeps
 * @property {import('vue').Ref<object[]>} shopOffers
 * @property {import('vue').Ref<object[]>} packOffers
 * @property {import('vue').Ref<(object | null)[]>} ownedTreasures
 * @property {(detail: object) => void} presentTreasureDetail
 * @property {() => { index: number, treasure: object }[]} buildShopOwnedPreviewNavItems
 * @property {(offer: object) => boolean} isShopTutorialBlockedShopInteraction
 * @property {(treasure: object) => void} maybeEndShopTutorialOnOfferOpen
 * @property {() => string} getFirstWordTutorialPhase
 * @property {() => object | null} getTreasureDetail
 * @property {() => void} clearTreasureDetail
 * @property {() => { playClose?: (opts?: object) => Promise<void> } | null | undefined} getTreasureDetailLayer
 * @property {(options?: { onAfterStockReroll?: () => void | Promise<void> }) => Promise<void>} rerollShop
 * @property {() => void} scheduleRunAutoSave
 */

/**
 * 商店货架点击 / reroll / 栏位重排（S.6：自 GamePanel 迁出）。
 *
 * @param {ShopSelectionHandlersDeps} deps
 */
export function createShopSelectionHandlers(deps) {
  const {
    shopOffers,
    packOffers,
    ownedTreasures,
    presentTreasureDetail,
    buildShopOwnedPreviewNavItems,
    isShopTutorialBlockedShopInteraction,
    maybeEndShopTutorialOnOfferOpen,
    getFirstWordTutorialPhase,
    getTreasureDetail,
    clearTreasureDetail,
    getTreasureDetailLayer,
    rerollShop,
    scheduleRunAutoSave,
  } = deps;

  /** @param {{ originEl?: HTMLElement | null, treasure: object }} payload */
  function onShopSelectOffer(payload) {
    const root = payload.originEl;
    const t = payload.treasure;
    if (isShopTutorialBlockedShopInteraction(t)) return;
    maybeEndShopTutorialOnOfferOpen(t);
    const deckOffer = t?.offerType === "deckTile" || t?.offerType === "deckLetter";
    presentTreasureDetail({
      kind: "offer",
      treasure: payload.treasure,
      originRect: deckOffer
        ? packDeckOfferFlyOriginRectFromEl(root)
        : offerFlyOriginRectFromEl(root),
      previewNav: createPreviewNavGroupFromItems(
        shopOffers.value,
        (o) => o.offerInstanceId === payload.treasure.offerInstanceId,
      ),
    });
  }

  /** @param {{ originEl?: HTMLElement | null, treasure: object }} payload */
  function onShopSelectPackOffer(payload) {
    const root = payload.originEl;
    if (isShopTutorialBlockedShopInteraction(payload.treasure)) return;
    maybeEndShopTutorialOnOfferOpen(payload.treasure);
    presentTreasureDetail({
      kind: "offer",
      treasure: payload.treasure,
      originRect: offerFlyOriginRectFromEl(root),
      previewNav: createPreviewNavGroupFromItems(
        packOffers.value,
        (o) => o.offerInstanceId === payload.treasure.offerInstanceId,
      ),
    });
  }

  /** @param {{ index: number, treasure: object, originEl?: HTMLElement | null }} payload */
  function onShopSelectOwned(payload) {
    if (!payload?.treasure) return;
    if (isShopTutorialBlockedShopInteraction(payload.treasure)) return;
    maybeEndShopTutorialOnOfferOpen(payload.treasure);
    const items = buildShopOwnedPreviewNavItems();
    presentTreasureDetail({
      kind: "owned",
      slotIndex: payload.index,
      treasure: payload.treasure,
      originRect: offerFlyOriginRectFromEl(payload.originEl),
      previewNav: createPreviewNavGroupFromItems(items, (x) => x.index === payload.index),
    });
  }

  async function onShopReroll() {
    if (getFirstWordTutorialPhase() === "shopIntro") return;
    await rerollShop({
      onAfterStockReroll: async () => {
        if (getTreasureDetail()) {
          await getTreasureDetailLayer()?.playClose?.();
        }
        clearTreasureDetail();
      },
    });
  }

  /** @param {(object | null)[]} nextSlots */
  function onShopReorderOwned(nextSlots) {
    if (!Array.isArray(nextSlots)) return;
    if (nextSlots.length !== ownedTreasures.value.length) return;
    ownedTreasures.value = [...nextSlots];
    scheduleRunAutoSave();
  }

  return {
    onShopSelectOffer,
    onShopSelectPackOffer,
    onShopSelectOwned,
    onShopReroll,
    onShopReorderOwned,
  };
}
