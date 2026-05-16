/**
 * 字母块专用配饰 id（`tile.accessoryId`；与宝藏通用配饰 `treasureAccessoryId` 可并存）。
 * 通用配饰见 `treasureAccessories.js`。
 */
export const TILE_ACCESSORY_LEVEL_UPGRADE = "level_upgrade";
/** 最后一手：首格佩戴时，该格稀有度对应的全局稀有度等级 +1 */
export const TILE_ACCESSORY_VIP_DIAMOND = "vip_diamond";
/** 所属字母块计分额外触发一次（支持与宝藏叠加） */
export const TILE_ACCESSORY_REWIND = "rewind";
/** 所属字母块在轮到计分时，额外获得 $3 */
export const TILE_ACCESSORY_COIN = "coin";

/**
 * 字母块配饰角标（与 `LetterTile` 内 DOM 类名一致）。
 * @param {string | null | undefined} accessoryId
 * @returns {{ chipClass: string, iconClass: string } | null}
 */
export function getTileAccessoryChipVisual(accessoryId) {
  const id = String(accessoryId ?? "").trim();
  if (id === TILE_ACCESSORY_LEVEL_UPGRADE) {
    return { chipClass: "tile-accessory-chip--level-upgrade", iconClass: "ri-arrow-up-double-line" };
  }
  if (id === TILE_ACCESSORY_VIP_DIAMOND) {
    return { chipClass: "tile-accessory-chip--vip-diamond", iconClass: "ri-vip-diamond-line" };
  }
  if (id === TILE_ACCESSORY_REWIND) {
    return { chipClass: "tile-accessory-chip--rewind", iconClass: "ri-rewind-line" };
  }
  if (id === TILE_ACCESSORY_COIN) {
    return { chipClass: "tile-accessory-chip--coin", iconClass: "ri-copper-coin-line" };
  }
  return null;
}
