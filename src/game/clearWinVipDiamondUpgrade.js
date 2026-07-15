import { readEntityAccessory } from "../accessories/accessoryState.js";
import { ACCESSORY_VIP_DIAMOND } from "../accessories/accessoryCatalog.js";

const LETTER_RARITY_ORDER = Object.freeze(["common", "rare", "epic", "legendary"]);

/**
 * 通关当手：词首字母块佩戴钻石配饰 → 升级该稀有度对应的全局等级。
 * @param {readonly { accessoryId?: string | null, treasureAccessoryId?: string | null, rarity?: string }[]} tiles
 * @param {boolean} willClearLevelThisSubmit
 * @returns {{ rk: string, beforeLevel: number, slotIndex: number } | null}
 */
export function resolveClearWinVipDiamondRarityUpgrade(tiles, willClearLevelThisSubmit) {
  if (!willClearLevelThisSubmit || !Array.isArray(tiles) || tiles.length === 0) return null;
  const first = tiles[0];
  if (!first || readEntityAccessory(first) !== ACCESSORY_VIP_DIAMOND) return null;
  const rk = String(first.rarity ?? "common");
  if (!LETTER_RARITY_ORDER.includes(rk)) return null;
  return { rk, beforeLevel: 0, slotIndex: 0 };
}

/**
 * @param {{ bossSoftViolation?: boolean, finalScore?: unknown }} detailed
 * @returns {boolean}
 */
export function shouldRegisterClearWinVipDiamondUpgrade(detailed) {
  return detailed?.bossSoftViolation !== true;
}
