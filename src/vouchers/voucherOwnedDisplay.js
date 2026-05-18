import { VOUCHERS_BY_ID } from "./voucherDefinitions.js";
import { formatVoucherDisplayName } from "./voucherDisplay.js";

/**
 * 已购优惠券按 pair 分组（同 pair 的 1/2 级合并为一格）。
 * @param {Iterable<string>} ownedIds
 * @returns {Array<{ pairId: string, tier1: import("./voucherTypes.js").VoucherDef | null, tier2: import("./voucherTypes.js").VoucherDef | null }>}
 */
export function buildOwnedVoucherPairGroups(ownedIds) {
  const ids = [...ownedIds].map(String);
  /** @type {Map<string, { pairId: string, tier1: import("./voucherTypes.js").VoucherDef | null, tier2: import("./voucherTypes.js").VoucherDef | null }>} */
  const byPair = new Map();
  for (const id of ids) {
    const def = VOUCHERS_BY_ID.get(id);
    if (!def) continue;
    let g = byPair.get(def.pairId);
    if (!g) {
      g = { pairId: def.pairId, tier1: null, tier2: null };
      byPair.set(def.pairId, g);
    }
    if (def.tier === 1) g.tier1 = def;
    else if (def.tier === 2) g.tier2 = def;
  }
  const seen = new Set();
  /** @type {ReturnType<typeof buildOwnedVoucherPairGroups>} */
  const out = [];
  for (const id of ids) {
    const def = VOUCHERS_BY_ID.get(id);
    if (!def || seen.has(def.pairId)) continue;
    seen.add(def.pairId);
    const g = byPair.get(def.pairId);
    if (g && (g.tier1 || g.tier2)) out.push(g);
  }
  return out;
}

/**
 * @param {{ pairId: string, tier1: import("./voucherTypes.js").VoucherDef | null, tier2: import("./voucherTypes.js").VoucherDef | null }} group
 * @returns {Array<{ emoji: string, displayName: string }>}
 */
export function voucherStampsForOwnedGroup(group) {
  const { tier1, tier2 } = group;
  const hasT2 = Boolean(tier2);
  /** @type {Array<{ emoji: string, displayName: string }>} */
  const stamps = [];
  if (tier1) {
    stamps.push({
      emoji: tier1.emoji,
      displayName: formatVoucherDisplayName(tier1, {
        pairHasTier2Owned: hasT2,
        showTier1Suffix: hasT2,
      }),
    });
  }
  if (tier2) {
    stamps.push({
      emoji: tier2.emoji,
      displayName: formatVoucherDisplayName(tier2, { pairHasTier2Owned: false }),
    });
  }
  return stamps;
}

/**
 * 对局信息 · 优惠券 Tab：单格展示名（与详情标题一致）。
 * @param {{ pairId: string, tier1: import("./voucherTypes.js").VoucherDef | null, tier2: import("./voucherTypes.js").VoucherDef | null }} group
 */
export function ownedVoucherGroupDisplayName(group) {
  const { tier1, tier2 } = group;
  const top = tier2 ?? tier1;
  if (!top) return "";
  const hasT2 = Boolean(tier2);
  return formatVoucherDisplayName(top, { pairHasTier2Owned: hasT2 });
}

/**
 * TreasureDetailLayer 用：已拥有优惠券详情 payload。
 * @param {{ pairId: string, tier1: import("./voucherTypes.js").VoucherDef | null, tier2: import("./voucherTypes.js").VoucherDef | null }} group
 */
export function buildOwnedVoucherDetailTreasure(group) {
  const { pairId, tier1, tier2 } = group;
  const top = tier2 ?? tier1;
  if (!top) return null;
  const hasT2 = Boolean(tier2);
  /** @type {Array<{ tier: number, title: string, description: string, emoji: string }>} */
  const ownedVoucherTiers = [];
  if (tier1) {
    ownedVoucherTiers.push({
      tier: 1,
      title: "一级",
      description: tier1.description,
      emoji: tier1.emoji,
    });
  }
  if (tier2) {
    ownedVoucherTiers.push({
      tier: 2,
      title: "二级",
      description: tier2.description,
      emoji: tier2.emoji,
    });
  }
  return {
    offerType: "voucher",
    pairId,
    voucherId: top.id,
    emoji: top.emoji,
    name: formatVoucherDisplayName(top, { pairHasTier2Owned: hasT2 }),
    description: ownedVoucherTiers.length === 1 ? ownedVoucherTiers[0].description : "",
    ownedVoucherTiers,
    price: top.price,
    rarity: "common",
    treasureId: `voucher_${top.id}`,
  };
}
