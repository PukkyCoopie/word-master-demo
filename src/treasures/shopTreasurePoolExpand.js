import { RARITY_TIER_MERGE_TREASURE_ID } from "../game/treasureRarityTierMerge.js";
import { filterTreasureDefsForPool } from "./treasureAvailability.js";
import { IMPLEMENTED_TREASURE_ID_SET } from "./treasureCatalog.js";
import { TREASURE_DEFINITIONS } from "./treasureRegistry.js";

/** @param {(string | null | undefined)[]} owned */
function shouldExpandLegendaryShopDrops(owned) {
  return owned.some((id) => {
    const s = String(id ?? "");
    return s === "142" || s === RARITY_TIER_MERGE_TREASURE_ID;
  });
}

/**
 * 持有流星（142）或滑块（97）时，将传说专属掉落纳入商店/牌包抽选池。
 * @param {import('./treasureTypes.js').TreasureDef[]} basePool
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('./treasureAvailability.js').TreasurePoolSnapshot} snap
 */
export function expandShopTreasurePoolForRun(basePool, ownedSlotTreasureIds, snap) {
  const owned = ownedSlotTreasureIds ?? [];
  if (!shouldExpandLegendaryShopDrops(owned)) return basePool;
  const inPool = new Set(basePool.map((t) => t.treasureId));
  const extras = filterTreasureDefsForPool(
    TREASURE_DEFINITIONS.filter(
      (t) =>
        IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId) &&
        t.rarity === "legendary" &&
        t.shopEligible === false,
    ),
    snap,
  ).filter((t) => !inPool.has(t.treasureId));
  return extras.length ? [...basePool, ...extras] : basePool;
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function shopAllowsOwnedTreasureDuplicates(ownedSlotTreasureIds) {
  return (ownedSlotTreasureIds ?? []).some((id) => String(id ?? "") === "141");
}
