import { formatVoucherDisplayName } from "./voucherDisplay.js";
import { pairHasTier2Owned } from "./voucherDefinitions.js";

/** 法术「促销」追加的商店优惠券：详情预览补充说明 */
export const SHOP_SPELL_GRANTED_VOUCHER_PANEL_TITLE = "临时";
export const SHOP_SPELL_GRANTED_VOUCHER_PANEL_DESCRIPTION =
  "这张优惠券会在进入下个Boss关卡后消失";

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
