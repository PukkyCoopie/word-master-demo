import { getTier1DefForPair, getTier2DefForPair, VOUCHERS_BY_ID } from "./voucherDefinitions.js";
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
  const tier1Def = getTier1DefForPair(pairId);
  const tier2Def = getTier2DefForPair(pairId);
  const tier1Description = tier1?.description ?? tier1Def?.description ?? "";
  const tier2Description = tier2?.description ?? tier2Def?.description ?? "";
  /** @type {Array<{ tier: number, title: string, description: string, emoji: string }>} */
  const ownedVoucherTiers = [];
  const tier1ForPanels = tier1 ?? tier1Def;
  if (tier2 && tier1ForPanels) {
    ownedVoucherTiers.push({
      tier: 1,
      title: "一级",
      description: tier1?.description ?? tier1Def?.description ?? "",
      emoji: tier1ForPanels.emoji,
    });
    ownedVoucherTiers.push({
      tier: 2,
      title: "二级",
      description: tier2Description,
      emoji: tier2.emoji,
    });
  } else if (tier1) {
    ownedVoucherTiers.push({
      tier: 1,
      title: "一级",
      description: tier1Description,
      emoji: tier1.emoji,
    });
  }
  const singleTierDescription = ownedVoucherTiers[0]?.description ?? "";
  return {
    offerType: "voucher",
    pairId,
    voucherId: top.id,
    emoji: top.emoji,
    name: formatVoucherDisplayName(top, { pairHasTier2Owned: hasT2 }),
    description: ownedVoucherTiers.length === 1 ? singleTierDescription : "",
    ownedVoucherTiers,
    price: top.price,
    rarity: "common",
    treasureId: `voucher_${top.id}`,
  };
}

/**
 * 收藏图鉴：按已发现最高 tier 构建优惠券详情（二级点开时展示一级+二级两框）。
 * @param {string} pairId
 * @param {0 | 1 | 2} discoveredTier
 */
export function buildDiscoveredVoucherDetailTreasure(pairId, discoveredTier) {
  const tier = /** @type {0 | 1 | 2} */ (Math.max(0, Math.min(2, Math.floor(Number(discoveredTier) || 0))));
  const tier1Def = getTier1DefForPair(pairId);
  if (!tier1Def) return null;
  if (tier < 1) {
    return {
      offerType: "voucher",
      pairId,
      voucherId: tier1Def.id,
      emoji: tier1Def.emoji,
      name: "",
      description: "",
      ownedVoucherTiers: [],
      price: tier1Def.price,
      rarity: "common",
      treasureId: `voucher_${tier1Def.id}`,
    };
  }
  const tier2Def = getTier2DefForPair(pairId);
  const top = tier >= 2 && tier2Def ? tier2Def : tier1Def;
  const hasT2 = tier >= 2 && Boolean(tier2Def);
  /** @type {Array<{ tier: number, title: string, description: string, emoji: string }>} */
  const ownedVoucherTiers = [];
  if (tier >= 2 && tier2Def) {
    ownedVoucherTiers.push({
      tier: 1,
      title: "一级",
      description: tier1Def.description ?? "",
      emoji: tier1Def.emoji,
    });
    ownedVoucherTiers.push({
      tier: 2,
      title: "二级",
      description: tier2Def.description ?? "",
      emoji: tier2Def.emoji,
    });
  } else {
    ownedVoucherTiers.push({
      tier: 1,
      title: "一级",
      description: tier1Def.description ?? "",
      emoji: tier1Def.emoji,
    });
  }
  const singleTierDescription = ownedVoucherTiers[0]?.description ?? "";
  return {
    offerType: "voucher",
    pairId,
    voucherId: top.id,
    emoji: top.emoji,
    name: formatVoucherDisplayName(top, { pairHasTier2Owned: hasT2 }),
    description: ownedVoucherTiers.length === 1 ? singleTierDescription : "",
    ownedVoucherTiers,
    price: top.price,
    rarity: "common",
    treasureId: `voucher_${top.id}`,
  };
}
