/** 宝藏 97：普通↔稀有、史诗↔传说视为同档 */

export const RARITY_TIER_MERGE_TREASURE_ID = "97";

const MERGE_PAIR = Object.freeze({
  common: "rare",
  rare: "common",
  epic: "legendary",
  legendary: "epic",
});

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
