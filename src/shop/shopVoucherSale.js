import {
  readOfferPresetSaleDiscount,
} from "../game/runPresetRuntime.js";
import { applyShopDiscountPrice, getShopDiscountMultiplier } from "../vouchers/voucherRuntime.js";
import { formatVoucherDisplayName } from "../vouchers/voucherDisplay.js";
import { VOUCHERS_BY_ID } from "../vouchers/voucherDefinitions.js";
import { readOfferRandomSaleDiscount } from "./shopRandomSale.js";

export const SHOP_VOUCHER_SALE_TITLE = "优惠券优惠";

const CLEARANCE_TIER1_ID = "v_clearance_1";
const CLEARANCE_TIER2_ID = "v_clearance_2";

/**
 * 预设 / 随机减价之后、特价标签券乘数之前的标价。
 * @param {number} basePrice
 * @param {object | null | undefined} offer
 * @param {string | null | undefined} presetId
 */
export function priceBeforeVoucherClearanceDiscount(basePrice, offer, presetId) {
  let p = Math.max(0, Math.floor(Number(basePrice) || 0));
  const presetDisc = readOfferPresetSaleDiscount(offer, presetId);
  if (presetDisc > 0) p = Math.max(0, p - presetDisc);
  const randomSale = readOfferRandomSaleDiscount(offer);
  if (randomSale > 0) p = Math.max(0, p - randomSale);
  return p;
}

/**
 * 特价标签券（-25% / -50%）在本件商品上的实际减价金额（元）。
 * @param {number} basePrice
 * @param {object | null | undefined} offer
 * @param {Iterable<string>} ownedVouchers
 * @param {string | null | undefined} presetId
 * @returns {number}
 */
export function readOfferVoucherSaleDiscountAmount(basePrice, offer, ownedVouchers, presetId) {
  if (getShopDiscountMultiplier(ownedVouchers) >= 1) return 0;
  const before = priceBeforeVoucherClearanceDiscount(basePrice, offer, presetId);
  const after = applyShopDiscountPrice(before, ownedVouchers);
  return Math.max(0, before - after);
}

/**
 * @param {Iterable<string>} ownedVoucherIds
 * @returns {string}
 */
function resolveClearanceVoucherDisplayName(ownedVoucherIds) {
  const owned = new Set([...ownedVoucherIds].map(String));
  if (owned.has(CLEARANCE_TIER2_ID)) {
    const def = VOUCHERS_BY_ID.get(CLEARANCE_TIER2_ID);
    return def ? formatVoucherDisplayName(def, { pairHasTier2Owned: false }) : "特价标签·二级";
  }
  if (owned.has(CLEARANCE_TIER1_ID)) {
    const def = VOUCHERS_BY_ID.get(CLEARANCE_TIER1_ID);
    return def ? formatVoucherDisplayName(def, { pairHasTier2Owned: false }) : "特价标签";
  }
  return "特价标签";
}

/**
 * @param {Iterable<string>} ownedVoucherIds
 * @param {number} discountAmount
 * @returns {string}
 */
export function formatShopVoucherSaleDescription(ownedVoucherIds, discountAmount) {
  const d = Math.max(1, Math.floor(Number(discountAmount) || 0));
  const name = resolveClearanceVoucherDisplayName(ownedVoucherIds);
  return `${name}使该商品优惠$${d}`;
}
