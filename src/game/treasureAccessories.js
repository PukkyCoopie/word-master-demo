/**
 * 宝藏通用配饰；定义见 `accessories/accessoryCatalog.js`。
 * @deprecated 新代码请从 `accessories/accessoryCatalog.js` 或 `accessories/accessoryResolve.js` 引用。
 */
export {
  ACCESSORY_FIRE as TREASURE_ACCESSORY_FIRE,
  ACCESSORY_DROP as TREASURE_ACCESSORY_DROP,
  ACCESSORY_WRENCH as TREASURE_ACCESSORY_WRENCH,
  ACCESSORY_CROP as TREASURE_ACCESSORY_CROP,
} from "../accessories/accessoryCatalog.js";

export { TREASURE_ACCESSORY_SLOT_CAP } from "../accessories/accessoryState.js";

import { getAccessoryIdsForRollPool } from "../accessories/accessoryResolve.js";
import { readTreasureAccessoryIds } from "../accessories/accessoryState.js";
import { getTreasureFieldAccessoryChipVisual } from "../accessories/accessoryResolve.js";

/** @type {readonly string[]} */
export const ALL_TREASURE_ACCESSORY_IDS = Object.freeze(getAccessoryIdsForRollPool("treasureShop"));

/** 字母块可掷出的宝藏配饰（不含裁剪） */
export const TILE_ROLLABLE_TREASURE_ACCESSORY_IDS = Object.freeze(getAccessoryIdsForRollPool("deckTileEdition"));

export {
  getTreasureFieldAccessoryChipVisual as getTreasureAccessoryChipVisual,
  getAccessoryTitle as getTreasureAccessoryPanelTitle,
  getAccessoryDescription as getTreasureAccessoryPanelDescription,
} from "../accessories/accessoryResolve.js";

/**
 * @param {{ treasureAccessoryIds?: unknown, treasureAccessoryId?: unknown } | null | undefined} entity
 * @returns {{ chipClass: string, iconClass: string }[]}
 */
export function getTreasureAccessoryChipVisualsFromEntity(entity) {
  return readTreasureAccessoryIds(entity)
    .map((id) => getTreasureFieldAccessoryChipVisual(id))
    .filter(Boolean);
}
