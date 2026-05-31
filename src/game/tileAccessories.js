/**
 * 字母块专用配饰 id（`tile.accessoryId` 字段）；定义见 `accessories/accessoryCatalog.js`。
 * @deprecated 新代码请从 `accessories/accessoryCatalog.js` 或 `accessories/accessoryResolve.js` 引用。
 */
export {
  ACCESSORY_LEVEL_UPGRADE as TILE_ACCESSORY_LEVEL_UPGRADE,
  ACCESSORY_VIP_DIAMOND as TILE_ACCESSORY_VIP_DIAMOND,
  ACCESSORY_REWIND as TILE_ACCESSORY_REWIND,
  ACCESSORY_COIN as TILE_ACCESSORY_COIN,
} from "../accessories/accessoryCatalog.js";

export { getBoardStoredAccessoryChipVisual as getTileAccessoryChipVisual } from "../accessories/accessoryResolve.js";
