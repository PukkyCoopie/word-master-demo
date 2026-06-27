import { filterTreasureDefsForSpellGrantPool } from "../treasures/treasureAvailability.js";
import { IMPLEMENTED_TREASURE_ID_SET } from "../treasures/treasureCatalog.js";
import { TREASURE_DEFINITIONS } from "../treasures/treasureRegistry.js";
import { rollDistinctShopTreasures } from "../treasures/shopTreasureRoll.js";

/**
 * 解析随机授予宝藏的落位与候选定义（无副作用）。
 *
 * @param {Object} params
 * @param {string | null} params.rarityFilter
 * @param {boolean} [params.expandWithCropWhenFull]
 * @param {string} params.accessoryCropId
 * @param {Set<string>} params.ownedIdSet
 * @param {object[]} params.shopTreasurePool
 * @param {() => object} params.buildTreasurePoolSnapshot
 * @param {(offer: object | null) => number} params.findPlacementIndex
 * @param {() => number} params.runRandom
 * @returns {{ ok: true, slotIndex: number, treasureDef: object, usedCrop: boolean } | { ok: false, slotIndex: -1 }}
 */
export function planRandomTreasureGrant({
  rarityFilter,
  expandWithCropWhenFull = false,
  accessoryCropId,
  ownedIdSet,
  shopTreasurePool,
  buildTreasurePoolSnapshot,
  findPlacementIndex,
  runRandom,
}) {
  let usedCrop = false;
  let slotIndex = findPlacementIndex(null);
  if (slotIndex < 0 && expandWithCropWhenFull) {
    slotIndex = findPlacementIndex({ treasureAccessoryIds: [accessoryCropId] });
    if (slotIndex >= 0) usedCrop = true;
  }
  if (slotIndex < 0) return { ok: false, slotIndex: -1 };

  const sourcePool = rarityFilter
    ? filterTreasureDefsForSpellGrantPool(
        TREASURE_DEFINITIONS.filter((t) => IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId)),
        buildTreasurePoolSnapshot(),
        rarityFilter,
      )
    : shopTreasurePool;
  const pool = sourcePool.filter((t) => !ownedIdSet.has(t.treasureId));
  if (!pool.length) return { ok: false, slotIndex: -1 };

  const picks = rollDistinctShopTreasures(pool, ownedIdSet, new Set(), 1, runRandom);
  const treasureDef = picks[0];
  if (!treasureDef) return { ok: false, slotIndex: -1 };

  return { ok: true, slotIndex, treasureDef, usedCrop };
}
