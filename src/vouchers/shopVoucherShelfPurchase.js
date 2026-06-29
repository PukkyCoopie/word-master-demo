/**
 * 购买优惠券后应清空的货架：法术「促销」追加券仅清 bonus，其余清 main。
 * @param {object | null | undefined} offer
 * @returns {"main" | "bonus" | null}
 */
export function resolveVoucherShelfClearTarget(offer) {
  if (offer?.offerType !== "voucher") return null;
  return offer.spellGranted === true ? "bonus" : "main";
}

/**
 * @param {object | null | undefined} shelf
 * @param {number} purchasedOfferInstanceId
 */
export function shouldClearVoucherShelfSlot(shelf, purchasedOfferInstanceId) {
  const pid = Math.floor(Number(purchasedOfferInstanceId) || 0);
  if (!Number.isFinite(pid) || pid <= 0) return false;
  if (shelf?.kind !== "offer") return false;
  return Math.floor(Number(shelf.offerInstanceId) || 0) === pid;
}
