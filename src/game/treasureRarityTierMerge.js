/** 宝藏 97：普通↔稀有、史诗↔传说视为同档 */

export const RARITY_TIER_MERGE_TREASURE_ID = "97";

const MERGE_PAIR = Object.freeze({
  common: "rare",
  rare: "common",
  epic: "legendary",
  legendary: "epic",
});

/** @param {string | null | undefined} rarity */
export function getRarityMergePartner(rarity) {
  const r = String(rarity ?? "").trim();
  return MERGE_PAIR[r] ?? null;
}

/**
 * 计分用稀有度：持有滑块（97）时低档字母按同组高档计分（普通→稀有，史诗→传说）。
 * 不改变格上实际 `tile.rarity`（宝藏「普通字母」等判定仍看真实稀有度）。
 * @param {string | null | undefined} rarity
 * @param {(string | null | undefined)[] | null | undefined} ownedSlotTreasureIds
 */
export function resolveScoringLetterRarity(rarity, ownedSlotTreasureIds) {
  const r = String(rarity ?? "common");
  if (!hasRarityTierMerge(ownedSlotTreasureIds)) return r;
  if (r === "common") return "rare";
  if (r === "epic") return "legendary";
  return r;
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function hasRarityTierMerge(ownedSlotTreasureIds) {
  return (ownedSlotTreasureIds ?? []).includes(RARITY_TIER_MERGE_TREASURE_ID);
}

/** @param {string | null | undefined} rarity */
export function getMergedRarityTier(rarity) {
  const r = String(rarity ?? "common");
  if (r === "common" || r === "rare") return "low";
  if (r === "epic" || r === "legendary") return "high";
  return r;
}

/**
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 */
export function raritiesShareMergedTier(a, b, ownedSlotTreasureIds) {
  if (!hasRarityTierMerge(ownedSlotTreasureIds)) return a === b;
  return getMergedRarityTier(a) === getMergedRarityTier(b);
}

/**
 * @param {string} rarity
 * @param {number} level
 * @param {(rarity: string, level: number) => void} setLevel
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 */
export function applyRarityLevelUpgrade(rarity, level, setLevel, ownedSlotTreasureIds) {
  const r = String(rarity ?? "");
  const lv = Math.max(1, Math.round(Number(level)) || 1);
  setLevel(r, lv);
  if (!hasRarityTierMerge(ownedSlotTreasureIds)) return;
  const pair = MERGE_PAIR[r];
  if (pair) setLevel(pair, lv);
}
