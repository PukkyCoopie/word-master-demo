/** 商店「随机优惠」：进店掷货时为单件商品附加的固定减价（元）。 */

export const SHOP_RANDOM_SALE_TITLE = "随机优惠";

/** @type {readonly { discount: number, weight: number }[]} */
export const SHOP_RANDOM_SALE_TIERS = Object.freeze([
  Object.freeze({ discount: 3, weight: 0.01 }),
  Object.freeze({ discount: 2, weight: 0.03 }),
  Object.freeze({ discount: 1, weight: 0.06 }),
]);

/**
 * @param {() => number} [rng]
 * @returns {0 | 1 | 2 | 3}
 */
export function rollShopRandomSaleDiscount(rng = Math.random) {
  const r = typeof rng === "function" ? rng() : Math.random();
  let acc = 0;
  for (const tier of SHOP_RANDOM_SALE_TIERS) {
    acc += tier.weight;
    if (r < acc) return /** @type {const} */ (tier.discount);
  }
  return 0;
}

/**
 * @param {{ randomSaleDiscount?: number }} [offer]
 * @returns {number}
 */
export function readOfferRandomSaleDiscount(offer) {
  const n = Math.floor(Number(offer?.randomSaleDiscount) || 0);
  return n > 0 ? n : 0;
}

/**
 * @param {object | null | undefined} offer
 * @param {() => number} [rng]
 */
export function applyRandomSaleToOfferRow(offer, rng = Math.random) {
  if (!offer || offer.kind !== "offer") return offer;
  const discount = rollShopRandomSaleDiscount(rng);
  if (discount > 0) offer.randomSaleDiscount = discount;
  else delete offer.randomSaleDiscount;
  return offer;
}

/**
 * @param {unknown[]} rows
 * @param {() => number} [rng]
 */
export function applyRandomSaleToShopStockRows(rows, rng = Math.random) {
  if (!Array.isArray(rows)) return rows;
  for (const row of rows) {
    if (row?.kind === "offer") applyRandomSaleToOfferRow(row, rng);
  }
  return rows;
}

/**
 * @param {number} discount
 * @returns {string}
 */
export function formatShopRandomSaleDescription(discount) {
  const d = Math.max(1, Math.floor(Number(discount) || 0));
  return `这件商品优惠了$${d}`;
}
