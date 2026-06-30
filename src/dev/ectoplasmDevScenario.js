import { ACCESSORY_CROP } from "../accessories/accessoryCatalog.js";
import { getAccessoryIdsForRollPool } from "../accessories/accessoryResolve.js";
import { IMPLEMENTED_TREASURE_ID_SET, TREASURE_CATALOG } from "../treasures/treasureCatalog.js";
import { rollDistinctShopTreasures } from "../treasures/shopTreasureRoll.js";

export const ECTOPLASM_DEV_QUERY = "ectoplasm";
export const ECTOPLASM_DEV_TREASURE_COUNT = 5;

/** 商店增益配饰池（火焰/水滴/扳手），不含裁剪 */
const NON_CROP_GAIN_ACCESSORY_IDS = Object.freeze(
  getAccessoryIdsForRollPool("treasureShop").filter((id) => id !== ACCESSORY_CROP),
);

/**
 * @param {() => number} [rng]
 */
export function isEctoplasmDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? "").get("dev") === ECTOPLASM_DEV_QUERY;
}

/**
 * 开局 5 个随机宝藏，各带一枚随机非裁剪配饰（供烛台法术调试）。
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 * @param {() => number} [rng]
 */
export function applyEctoplasmDevOwnedTreasures(ownedTreasuresRef, buildOwnedTreasureSlot, rng = Math.random) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  const pool = TREASURE_CATALOG.filter((t) => IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId));
  const picks = rollDistinctShopTreasures(pool, new Set(), new Set(), ECTOPLASM_DEV_TREASURE_COUNT, rnd);
  const accPool = NON_CROP_GAIN_ACCESSORY_IDS;
  /** @type {(object | null)[]} */
  const slots = picks.map((def) => {
    const accessoryId = accPool[Math.floor(rnd() * accPool.length)] ?? accPool[0];
    return buildOwnedTreasureSlot({
      treasureId: def.treasureId,
      price: def.price,
      treasureAccessoryIds: [accessoryId],
    });
  });
  ownedTreasuresRef.value = slots;
  return {
    treasureIds: picks.map((def) => def.treasureId),
    accessoryIds: slots.map((s) => s?.treasureAccessoryIds?.[0] ?? null),
    slotCount: slots.length,
  };
}
