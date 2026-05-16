import {
  TILE_ACCESSORY_COIN,
  TILE_ACCESSORY_LEVEL_UPGRADE,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_VIP_DIAMOND,
} from "../game/tileAccessories.js";

const TILE_ACC_POOL = Object.freeze([
  TILE_ACCESSORY_LEVEL_UPGRADE,
  TILE_ACCESSORY_VIP_DIAMOND,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_COIN,
]);

/** 有「魔法棒·二级」时，商店字母牌带棋盘配饰的概率上限 */
export const SHOP_TILE_ACCESSORY_CHANCE = 0.35;

/**
 * @param {() => number} rng
 * @param {boolean} illusionOwned
 * @returns {string | null}
 */
export function rollShopDeckTileAccessoryId(rng, illusionOwned) {
  if (!illusionOwned) return null;
  if (typeof rng !== "function" || rng() >= SHOP_TILE_ACCESSORY_CHANCE) return null;
  const i = Math.floor(rng() * TILE_ACC_POOL.length);
  return TILE_ACC_POOL[i] ?? null;
}
