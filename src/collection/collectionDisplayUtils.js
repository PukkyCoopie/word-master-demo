/** 收藏页未解锁条目的占位名称 */
export const COLLECTION_UNKNOWN_LABEL = "???";

/** @param {string | null | undefined} rarity */
export function gemClassForTreasureRarity(rarity) {
  if (rarity === "epic") return "gem-epic";
  if (rarity === "legendary") return "gem-legendary";
  if (rarity === "common") return "gem-common";
  return "gem-rare";
}
