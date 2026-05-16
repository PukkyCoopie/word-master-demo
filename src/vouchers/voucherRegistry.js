import { VOUCHER_DEFINITIONS, getTier1DefForPair, getTier2DefForPair } from "./voucherDefinitions.js";

/**
 * @param {Iterable<string>} ownedVoucherIds
 * @returns {import("./voucherTypes.js").VoucherDef[]}
 */
export function listPurchasableVoucherDefs(ownedVoucherIds) {
  const owned = new Set(ownedVoucherIds);
  /** @type {import("./voucherTypes.js").VoucherDef[]} */
  const out = [];
  for (const def of VOUCHER_DEFINITIONS) {
    if (!def.inShopPool) continue;
    if (owned.has(def.id)) continue;
    if (def.tier === 2) {
      const t1 = getTier1DefForPair(def.pairId);
      if (!t1 || !owned.has(t1.id)) continue;
    }
    const t2 = getTier2DefForPair(def.pairId);
    if (def.tier === 1 && t2 && owned.has(t2.id)) continue;
    out.push(def);
  }
  return out;
}

/**
 * @param {Iterable<string>} ownedVoucherIds
 * @param {() => number} rng
 * @returns {import("./voucherTypes.js").VoucherDef | null}
 */
export function rollShopVoucherOfferDef(ownedVoucherIds, rng = Math.random) {
  const eligible = listPurchasableVoucherDefs(ownedVoucherIds);
  if (!eligible.length) return null;
  return eligible[Math.floor(rng() * eligible.length)] ?? null;
}
