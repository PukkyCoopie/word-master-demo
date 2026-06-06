import { applyPresetAndShopDiscountPrice } from "../game/runPresetRuntime.js";
import { canAffordWallet } from "../treasures/treasureWalletFloor.js";
import { readOfferRandomSaleDiscount } from "./shopRandomSale.js";

/** @typedef {'default' | 'unaffordable' | 'discounted'} ShopOfferPriceTone */

/**
 * @param {number} basePrice
 * @param {{ randomSaleDiscount?: number, offerType?: string, bundleKind?: string }} offer
 * @param {Iterable<string>} ownedVouchers
 * @param {string | null | undefined} presetId
 */
export function resolveShopOfferEffectivePrice(basePrice, offer, ownedVouchers, presetId) {
  return applyPresetAndShopDiscountPrice(basePrice, offer ?? {}, ownedVouchers, presetId);
}

/**
 * @param {{
 *   wallet: number,
 *   effectivePrice: number,
 *   offer?: { randomSaleDiscount?: number },
 *   walletFloor?: number,
 * }} ctx
 * @returns {ShopOfferPriceTone}
 */
export function resolveShopOfferPriceTone(ctx) {
  if (readOfferRandomSaleDiscount(ctx.offer) > 0) return "discounted";
  const floor = ctx.walletFloor ?? 0;
  if (!canAffordWallet(ctx.wallet, ctx.effectivePrice, floor)) return "unaffordable";
  return "default";
}

/**
 * @param {ShopOfferPriceTone} tone
 * @returns {string}
 */
export function shopOfferPriceInnerClass(tone) {
  if (tone === "discounted") return "shop-treasure-price-inner--discounted";
  if (tone === "unaffordable") return "shop-treasure-price-inner--unaffordable";
  return "";
}

/**
 * @param {number} basePrice
 * @param {object} offer
 * @param {{
 *   wallet: number,
 *   ownedVoucherIds?: Iterable<string>,
 *   runPresetId?: string | null,
 *   walletFloor?: number,
 *   packStruck?: boolean,
 * }} ctx
 */
export function buildShopOfferPriceView(basePrice, offer, ctx) {
  const effective = resolveShopOfferEffectivePrice(
    basePrice,
    offer,
    ctx.ownedVoucherIds ?? [],
    ctx.runPresetId,
  );
  const tone = resolveShopOfferPriceTone({
    wallet: ctx.wallet,
    effectivePrice: effective,
    offer,
    walletFloor: ctx.walletFloor,
  });
  const innerClass = shopOfferPriceInnerClass(tone);
  /** @type {Record<string, boolean>} */
  const innerClasses = {};
  if (innerClass) innerClasses[innerClass] = true;
  if (ctx.packStruck) innerClasses["shop-treasure-price-inner--pack-struck"] = true;
  return {
    amount: effective,
    tone,
    innerClass,
    innerClasses,
  };
}
