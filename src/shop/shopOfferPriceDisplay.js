import {
  applyPresetAndShopDiscountPrice,
  readOfferPresetSaleDiscount,
} from "../game/runPresetRuntime.js";
import { canAffordWallet } from "../treasures/treasureWalletFloor.js";
import { readOfferRandomSaleDiscount } from "./shopRandomSale.js";
import { readOfferVoucherSaleDiscountAmount } from "./shopVoucherSale.js";

/** @typedef {'default' | 'unaffordable' | 'discounted' | 'discounted-unaffordable'} ShopOfferPriceTone */

/**
 * 宝藏「门票」：升级卡与升级包在商店内免费。
 * @param {{ offerType?: string, bundleKind?: string } | null | undefined} offer
 * @param {boolean} [shopUpgradesFree=false]
 */
export function isShopTicketUpgradeOfferFree(offer, shopUpgradesFree = false) {
  if (!shopUpgradesFree) return false;
  if (offer?.offerType === "upgrade") return true;
  if (offer?.offerType === "bundlePack" && offer?.bundleKind === "upgrade") return true;
  return false;
}

/**
 * @param {number} basePrice
 * @param {{ randomSaleDiscount?: number, offerType?: string, bundleKind?: string }} offer
 * @param {Iterable<string>} ownedVouchers
 * @param {string | null | undefined} presetId
 * @param {boolean} [shopUpgradesFree=false]
 */
export function resolveShopOfferEffectivePrice(
  basePrice,
  offer,
  ownedVouchers,
  presetId,
  shopUpgradesFree = false,
) {
  const discounted = applyPresetAndShopDiscountPrice(basePrice, offer ?? {}, ownedVouchers, presetId);
  if (isShopTicketUpgradeOfferFree(offer, shopUpgradesFree)) return 0;
  return discounted;
}

/**
 * @param {{
 *   wallet: number,
 *   effectivePrice: number,
 *   basePrice?: number,
 *   offer?: { randomSaleDiscount?: number, offerType?: string, bundleKind?: string },
 *   ownedVoucherIds?: Iterable<string>,
 *   runPresetId?: string | null,
 *   walletFloor?: number,
 *   shopUpgradesFree?: boolean,
 * }} ctx
 * @returns {ShopOfferPriceTone}
 */
export function resolveShopOfferPriceTone(ctx) {
  const basePrice = Math.max(0, Math.floor(Number(ctx.basePrice) || 0));
  const hasDiscount =
    isShopTicketUpgradeOfferFree(ctx.offer, ctx.shopUpgradesFree) ||
    readOfferRandomSaleDiscount(ctx.offer) > 0 ||
    readOfferPresetSaleDiscount(ctx.offer, ctx.runPresetId) > 0 ||
    readOfferVoucherSaleDiscountAmount(
      basePrice,
      ctx.offer,
      ctx.ownedVoucherIds ?? [],
      ctx.runPresetId,
    ) > 0;
  const floor = ctx.walletFloor ?? 0;
  const unaffordable = !canAffordWallet(ctx.wallet, ctx.effectivePrice, floor);
  if (hasDiscount && unaffordable) return "discounted-unaffordable";
  if (hasDiscount) return "discounted";
  if (unaffordable) return "unaffordable";
  return "default";
}

/**
 * @param {ShopOfferPriceTone} tone
 * @returns {string}
 */
export function shopOfferPriceInnerClass(tone) {
  if (tone === "discounted-unaffordable") return "shop-treasure-price-inner--discounted-unaffordable";
  if (tone === "discounted") return "shop-treasure-price-inner--discounted";
  if (tone === "unaffordable") return "shop-treasure-price-inner--unaffordable";
  return "";
}

/**
 * 组合包内选项：仅展示单张原价（划线参考价），不参与任何商店优惠。
 * @param {number} basePrice
 */
export function buildPackInnerOfferPriceView(basePrice) {
  const amount = Math.max(0, Math.floor(Number(basePrice) || 0));
  return {
    amount,
    tone: /** @type {ShopOfferPriceTone} */ ("default"),
    innerClass: "",
    innerClasses: { "shop-treasure-price-inner--pack-struck": true },
  };
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
 *   shopUpgradesFree?: boolean,
 * }} ctx
 */
export function buildShopOfferPriceView(basePrice, offer, ctx) {
  const shopUpgradesFree = ctx.shopUpgradesFree === true;
  const effective = resolveShopOfferEffectivePrice(
    basePrice,
    offer,
    ctx.ownedVoucherIds ?? [],
    ctx.runPresetId,
    shopUpgradesFree,
  );
  const tone = resolveShopOfferPriceTone({
    wallet: ctx.wallet,
    effectivePrice: effective,
    basePrice,
    offer,
    ownedVoucherIds: ctx.ownedVoucherIds ?? [],
    runPresetId: ctx.runPresetId,
    walletFloor: ctx.walletFloor,
    shopUpgradesFree,
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
