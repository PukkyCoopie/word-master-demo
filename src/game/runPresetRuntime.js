import { readOfferRandomSaleDiscount } from "../shop/shopRandomSale.js";
import { applyShopDiscountPrice } from "../vouchers/voucherRuntime.js";
import { getRunPresetDef, normalizeRunPresetId } from "./runPresetDefinitions.js";

/** @param {string | null | undefined} presetId */
export function getRunPresetEffects(presetId) {
  return getRunPresetDef(presetId).effects;
}

/** @param {string | null | undefined} presetId */
export function getPresetHandsPerLevelDelta(presetId) {
  return Math.floor(Number(getRunPresetEffects(presetId).handsPerLevelDelta) || 0);
}

/** @param {string | null | undefined} presetId */
export function getPresetRemovalsPerLevelDelta(presetId) {
  return Math.floor(Number(getRunPresetEffects(presetId).removalsPerLevelDelta) || 0);
}

/** @param {string | null | undefined} presetId */
export function getPresetTreasureSlotDelta(presetId) {
  return Math.floor(Number(getRunPresetEffects(presetId).treasureSlotDelta) || 0);
}

/** @param {string | null | undefined} presetId */
export function getPresetStartVoucherIds(presetId) {
  const ids = getRunPresetEffects(presetId).startVoucherIds;
  return Array.isArray(ids) ? ids.map(String) : [];
}

/** @param {string | null | undefined} presetId */
export function getPresetStartMoneyBonus(presetId) {
  return Math.max(0, Math.floor(Number(getRunPresetEffects(presetId).startMoneyBonus) || 0));
}

/** @param {string | null | undefined} presetId */
export function getPresetStartWildcardCount(presetId) {
  return Math.max(0, Math.floor(Number(getRunPresetEffects(presetId).startWildcardCount) || 0));
}

/** @param {string | null | undefined} presetId */
export function getPresetWordLengthJudgmentBonus(presetId) {
  return Math.max(0, Math.floor(Number(getRunPresetEffects(presetId).wordLengthJudgmentBonus) || 0));
}

/** @param {string | null | undefined} presetId */
export function getPresetSettlementMode(presetId) {
  return getRunPresetEffects(presetId).settlementMode ?? "default";
}

/** @param {string | null | undefined} presetId */
export function presetDisablesInterest(presetId) {
  return getPresetSettlementMode(presetId) === "convertRemainsNoInterest";
}

/** @param {string | null | undefined} presetId */
export function presetUsesFiveSlotLayoutAtFour(presetId) {
  return getRunPresetEffects(presetId).treasureSlotsUseFiveSlotLayoutAtFour === true;
}

/**
 * @param {{ offerType?: string, bundleKind?: string }} offer
 * @returns {'upgrade' | 'spell' | 'letter' | null}
 */
export function resolveShopOfferPresetCategory(offer) {
  const ot = String(offer?.offerType ?? "");
  const bk = String(offer?.bundleKind ?? "");
  if (ot === "upgrade" || bk === "upgrade") return "upgrade";
  if (ot === "spell" || bk === "spell") return "spell";
  if (ot === "deckTile" || bk === "tile") return "letter";
  return null;
}

/**
 * @param {number} basePrice
 * @param {{ offerType?: string, bundleKind?: string }} offer
 * @param {Iterable<string>} ownedVouchers
 * @param {string | null | undefined} presetId
 */
export function applyPresetAndShopDiscountPrice(basePrice, offer, ownedVouchers, presetId) {
  const pid = normalizeRunPresetId(presetId);
  let p = Math.max(0, Math.floor(Number(basePrice) || 0));
  const cat = resolveShopOfferPresetCategory(offer);
  const disc = cat ? getRunPresetEffects(pid).shopFlatDiscount?.[cat] : 0;
  if (disc != null && Number(disc) > 0) {
    p = Math.max(0, p - Math.floor(Number(disc)));
  }
  const randomSale = readOfferRandomSaleDiscount(offer);
  if (randomSale > 0) {
    p = Math.max(0, p - randomSale);
  }
  return applyShopDiscountPrice(p, ownedVouchers);
}
