import { formatVoucherDisplayName } from "./voucherDisplay.js";
import { pairHasTier2Owned } from "./voucherDefinitions.js";

/**
 * @param {import("./voucherTypes.js").VoucherDef} def
 * @param {number} offerInstanceId
 * @param {Iterable<string>} ownedVoucherIds
 * @param {{ spellGranted?: boolean }} [opts]
 */
export function buildVoucherShopOfferRow(def, offerInstanceId, ownedVoucherIds, opts = {}) {
  return {
    kind: "offer",
    offerType: "voucher",
    offerInstanceId,
    voucherId: def.id,
    price: def.price,
    name: formatVoucherDisplayName(def, {
      pairHasTier2Owned: pairHasTier2Owned(def.pairId, ownedVoucherIds),
    }),
    description: def.description,
    emoji: def.emoji,
    rarity: "common",
    treasureId: `voucher_${def.id}`,
    spellGranted: opts.spellGranted === true,
  };
}
