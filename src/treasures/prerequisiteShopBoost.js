/**
 * 有 `unlockPrerequisite` 的宝藏 — 商店单卡区出现规则：
 *
 * 阶段一（生涯货架尚未出现过）：该格抽到宝藏时，50% 仅从「前提满足且未拥有且未出现」子池按稀有度权重抽选，否则走默认可用池。
 * 阶段二（已出现过，含牌包首次展示）：并入默认可用池，档内权重 ×(1 + boost)；boost 从 100% 起每次单卡区再展示减半，下限 25%。
 */
import { treasureHasUnlockPrerequisite } from "../collection/collectionEntryState.js";
import { isTreasureUnlocked, meetsTreasurePoolPrerequisite } from "./treasureAvailability.js";

/** 单卡区槽位：前提宝藏子池优先判定成功率 */
export const PREREQUISITE_PHASE1_SLOT_PRIORITY_CHANCE = 0.5;

/** 阶段二权重加成下限（+25%） */
export const PREREQUISITE_WEIGHT_BOOST_FLOOR = 0.25;

/**
 * @param {string} treasureId
 * @param {Iterable<string>} shopAppearedPrerequisiteTreasureIds
 * @param {Record<string, number> | null | undefined} singleCardAppearanceCounts 仅单卡区货架展示次数
 * @returns {number} 档内权重乘数（1 = 无加成）
 */
export function getPrerequisiteShopWeightMultiplier(
  treasureId,
  shopAppearedPrerequisiteTreasureIds,
  singleCardAppearanceCounts,
) {
  const id = String(treasureId ?? "").trim();
  if (!id || !treasureHasUnlockPrerequisite(id)) return 1;

  const appeared = new Set(
    [...(shopAppearedPrerequisiteTreasureIds ?? [])].map(String),
  );
  if (!appeared.has(id)) return 1;

  const singleCardN = Math.max(
    0,
    Math.floor(Number(singleCardAppearanceCounts?.[id]) || 0),
  );
  /** 牌包等非单卡区首次展示时单卡计数为 0，仍按「已展示 1 次」计 100% 加成 */
  const effectiveDisplays = Math.max(1, singleCardN);
  const boost = Math.max(
    PREREQUISITE_WEIGHT_BOOST_FLOOR,
    1 / 2 ** (effectiveDisplays - 1),
  );
  return 1 + boost;
}

/**
 * @param {Iterable<string>} shopAppearedPrerequisiteTreasureIds
 * @param {Record<string, number> | null | undefined} singleCardAppearanceCounts
 * @returns {(treasureId: string) => number}
 */
export function buildPrerequisiteWeightMultiplierGetter(
  shopAppearedPrerequisiteTreasureIds,
  singleCardAppearanceCounts,
) {
  return (treasureId) =>
    getPrerequisiteShopWeightMultiplier(
      treasureId,
      shopAppearedPrerequisiteTreasureIds,
      singleCardAppearanceCounts,
    );
}

/**
 * 阶段一候选：前提满足、未拥有、生涯货架尚未出现过。
 *
 * @param {readonly import('./treasureTypes.js').TreasureDef[]} pool 通常为当前默认可用池子集
 * @param {import('./treasureAvailability.js').TreasurePoolSnapshot} snap
 * @param {Iterable<string>} ownedTreasureIds
 * @param {Iterable<string>} shopAppearedPrerequisiteTreasureIds
 * @returns {import('./treasureTypes.js').TreasureDef[]}
 */
export function filterPhase1PrerequisiteTreasures(
  pool,
  snap,
  ownedTreasureIds,
  shopAppearedPrerequisiteTreasureIds,
) {
  const owned = new Set([...(ownedTreasureIds ?? [])].map(String));
  const appeared = new Set([...(shopAppearedPrerequisiteTreasureIds ?? [])].map(String));
  /** @type {import('./treasureTypes.js').TreasureDef[]} */
  const out = [];
  for (const def of pool ?? []) {
    if (!def?.treasureId) continue;
    const id = String(def.treasureId);
    if (!treasureHasUnlockPrerequisite(id)) continue;
    if (owned.has(id)) continue;
    if (appeared.has(id)) continue;
    if (!isTreasureUnlocked(def, snap)) continue;
    if (!meetsTreasurePoolPrerequisite(def, snap)) continue;
    out.push(def);
  }
  return out;
}

/**
 * @param {string | null | undefined} treasureId
 * @param {(id: string) => void} [onRecord]
 */
export function notifyPrerequisiteTreasureShopShelfAppearance(treasureId, onRecord) {
  const id = String(treasureId ?? "").trim();
  if (!id || !treasureHasUnlockPrerequisite(id)) return;
  onRecord?.(id);
}

/**
 * @param {readonly import('./treasureTypes.js').TreasureDef[]} tier
 * @param {() => number} rng
 * @param {(treasureId: string) => number} [getWeightMultiplier]
 */
export function pickUniformFromTierWithWeightMultipliers(tier, rng, getWeightMultiplier) {
  if (!tier.length) return null;
  if (typeof getWeightMultiplier !== "function") {
    return tier[Math.floor(rng() * tier.length)];
  }

  let total = 0;
  /** @type {number[]} */
  const weights = [];
  for (const def of tier) {
    const w = Math.max(0, Number(getWeightMultiplier(String(def.treasureId))) || 0);
    const weight = w > 0 ? w : 1;
    weights.push(weight);
    total += weight;
  }
  if (total <= 0) return tier[Math.floor(rng() * tier.length)];

  let u = rng() * total;
  for (let i = 0; i < tier.length; i += 1) {
    u -= weights[i];
    if (u < 0) return tier[i];
  }
  return tier[tier.length - 1];
}
