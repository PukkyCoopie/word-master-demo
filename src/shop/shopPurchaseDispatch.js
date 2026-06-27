/** @typedef {'none' | 'spellGrantFlow' | 'packInner' | 'offer'} ShopPurchaseRoute */

/** @typedef {'bundlePack' | 'voucher' | 'deckTile' | 'spell' | 'upgrade' | 'treasure'} ShopOfferHandler */

/**
 * @param {string | null | undefined} offerType
 * @returns {ShopOfferHandler | null}
 */
export function resolveShopOfferHandler(offerType) {
  const t = String(offerType ?? "");
  if (t === "bundlePack") return "bundlePack";
  if (t === "voucher") return "voucher";
  if (t === "deckTile" || t === "deckLetter") return "deckTile";
  if (t === "spell") return "spell";
  if (t === "upgrade") return "upgrade";
  if (t === "treasure" || !t) return "treasure";
  return null;
}

/**
 * 识别详情层购买入口应走哪条事务路径（不含价格/库存校验）。
 *
 * @param {object | null | undefined} detail
 * @returns {{ route: ShopPurchaseRoute, offerType?: string, handler?: ShopOfferHandler | null }}
 */
export function resolveShopPurchaseRoute(detail) {
  if (!detail) return { route: "none" };
  if (detail.spellGrantFlow === true) return { route: "spellGrantFlow" };
  if (detail.kind === "pack-inner") return { route: "packInner" };
  if (detail.kind !== "offer") return { route: "none" };
  const offerType = detail.treasure?.offerType;
  return {
    route: "offer",
    offerType: offerType != null ? String(offerType) : undefined,
    handler: resolveShopOfferHandler(offerType),
  };
}
