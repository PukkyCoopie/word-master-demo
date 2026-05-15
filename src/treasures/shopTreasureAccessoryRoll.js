import {
  TREASURE_ACCESSORY_CROP,
  TREASURE_ACCESSORY_DROP,
  TREASURE_ACCESSORY_FIRE,
  TREASURE_ACCESSORY_WRENCH,
} from "../game/treasureAccessories.js";

/** 货架宝藏带配饰的概率 */
export const SHOP_TREASURE_ACCESSORY_CHANCE = 0.15;

/**
 * @param {string | null | undefined} accessoryId
 * @returns {number}
 */
export function getShopTreasureAccessoryPriceAdd(accessoryId) {
  const id = String(accessoryId ?? "").trim();
  if (id === TREASURE_ACCESSORY_FIRE || id === TREASURE_ACCESSORY_DROP) return 1;
  if (id === TREASURE_ACCESSORY_WRENCH) return 2;
  if (id === TREASURE_ACCESSORY_CROP) return 3;
  return 0;
}

/**
 * 15% 带配饰；条件于带配饰时 fire 30%、drop 30%、wrench 25%、crop 15%。
 * @param {() => number} [rng=Math.random] 返回 [0,1)
 * @returns {string | null}
 */
export function rollShopTreasureAccessoryId(rng = Math.random) {
  if (typeof rng !== "function" || rng() >= SHOP_TREASURE_ACCESSORY_CHANCE) return null;
  const u = rng();
  const t = u * 100;
  if (t < 30) return TREASURE_ACCESSORY_FIRE;
  if (t < 60) return TREASURE_ACCESSORY_DROP;
  if (t < 85) return TREASURE_ACCESSORY_WRENCH;
  return TREASURE_ACCESSORY_CROP;
}
