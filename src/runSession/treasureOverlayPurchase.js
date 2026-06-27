import { computed } from "vue";
import { canAffordWallet } from "../treasures/treasureWalletFloor.js";
import { canPurchaseSpellInShop } from "../spells/spellPoolEligibility.js";
import { getGlyphPurchaseTargetLevelIndex } from "../vouchers/voucherRuntime.js";

/**
 * 宝藏详情层「可购买」与 pack-inner 已领取状态。
 * @param {{
 *   treasureDetail: import('vue').Ref<object | null>,
 *   packPickSession: import('vue').Ref<object | null>,
 *   packPickOptionKeyOf: (offer: object) => string,
 *   packPickRequiredPicks: (sess: object) => number,
 *   money: import('vue').Ref<number>,
 *   levelIndex: import('vue').Ref<number>,
 *   shopPhase: {
 *     shopPriceForOffer: Function,
 *     runWalletFloor: import('vue').Ref<number>,
 *     spellPoolEligibilityForShop: () => unknown,
 *     isCouponDropSpellBlockedByBonusVoucher: (spellId: string) => boolean,
 *   },
 *   canPlaceTreasureOffer: (offer: object) => boolean,
 * }} deps
 */
export function createTreasureOverlayPurchaseState(deps) {
  const treasurePackInnerAlreadyClaimed = computed(() => {
    const d = deps.treasureDetail.value;
    if (d?.kind !== "pack-inner") return false;
    const sess = deps.packPickSession.value;
    if (!sess) return false;
    const key = String(d.packOptionKey ?? deps.packPickOptionKeyOf(d.treasure));
    return (sess.claimedKeys ?? []).includes(key);
  });

  const treasureCanBuyOffer = computed(() => {
    const d = deps.treasureDetail.value;
    if (!d) return false;
    if (d.spellGrantFlow === true) {
      const sid = String(d.treasure?.spellId ?? "");
      if (deps.shopPhase.isCouponDropSpellBlockedByBonusVoucher(sid)) return false;
      return true;
    }
    const t = d.treasure;
    if (!t) return false;

    if (d.kind === "pack-inner") {
      const sess = deps.packPickSession.value;
      if (!sess) return false;
      const key = String(d.packOptionKey ?? deps.packPickOptionKeyOf(t));
      const claimed = sess.claimedKeys ?? [];
      if (claimed.includes(key)) return false;
      if (claimed.length >= deps.packPickRequiredPicks(sess)) return false;
      if (t.offerType === "treasure") {
        return deps.canPlaceTreasureOffer(t);
      }
      return true;
    }

    if (d.kind !== "offer") return false;
    const w = deps.money.value;
    const p0 = Number(t.price);
    if (!Number.isFinite(w) || !Number.isFinite(p0)) return false;
    const p = deps.shopPhase.shopPriceForOffer(p0, t);
    const floor = deps.shopPhase.runWalletFloor.value;
    if (t.offerType === "voucher") {
      const vid = String(t.voucherId ?? "");
      if (vid === "v_glyph_1" || vid === "v_glyph_2") {
        if (getGlyphPurchaseTargetLevelIndex(deps.levelIndex.value) == null) return false;
      }
      return canAffordWallet(w, p, floor);
    }
    if (t.offerType === "bundlePack") return canAffordWallet(w, p, floor);
    if (t.offerType === "spell") {
      const sid = String(t.spellId ?? "");
      if (!canPurchaseSpellInShop(sid, deps.shopPhase.spellPoolEligibilityForShop())) return false;
      if (deps.shopPhase.isCouponDropSpellBlockedByBonusVoucher(sid)) return false;
      return canAffordWallet(w, p, floor);
    }
    if (t.offerType === "upgrade") return canAffordWallet(w, p, floor);
    if (t.offerType === "deckTile" || t.offerType === "deckLetter") return canAffordWallet(w, p, floor);
    if (t.offerType === "treasure") return canAffordWallet(w, p, floor) && deps.canPlaceTreasureOffer(t);
    return canAffordWallet(w, p, floor);
  });

  return { treasureCanBuyOffer, treasurePackInnerAlreadyClaimed };
}
