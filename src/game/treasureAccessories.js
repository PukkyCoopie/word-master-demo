/**
 * 宝藏通用配饰（火焰/水滴/扳手/裁剪）：可装备于**已拥有宝藏槽**与**字母块牌张**（`treasureAccessoryId`）。
 *
 * - **通用**（本文件 id）：火焰/水滴/扳手/裁剪；字母块上仅随机前三者（裁剪仅扩栏位，不进包）。
 * - **字母块专用**（`tile.accessoryId`）：升级/钻石/重播/硬币，见 `tileAccessories.js`。
 *
 * **标题与效果说明**的唯一事实源：`gameConceptCopy.js`（`TREASURE_ACCESSORY_CONCEPT_BY_ID`）。
 */
import {
  getTreasureAccessoryPanelDescription as getTreasureAccessoryPanelDescriptionFromConcept,
  getTreasureAccessoryPanelTitle as getTreasureAccessoryPanelTitleFromConcept,
} from "./gameConceptCopy.js";

export const TREASURE_ACCESSORY_FIRE = "treasure_acc_fire";
export const TREASURE_ACCESSORY_DROP = "treasure_acc_drop";
export const TREASURE_ACCESSORY_WRENCH = "treasure_acc_wrench";
export const TREASURE_ACCESSORY_CROP = "treasure_acc_crop";

/** @type {readonly string[]} */
export const ALL_TREASURE_ACCESSORY_IDS = Object.freeze([
  TREASURE_ACCESSORY_FIRE,
  TREASURE_ACCESSORY_DROP,
  TREASURE_ACCESSORY_WRENCH,
  TREASURE_ACCESSORY_CROP,
]);

/** 商店/牌包字母块可掷出的宝藏配饰（不含裁剪） */
export const TILE_ROLLABLE_TREASURE_ACCESSORY_IDS = Object.freeze([
  TREASURE_ACCESSORY_FIRE,
  TREASURE_ACCESSORY_DROP,
  TREASURE_ACCESSORY_WRENCH,
]);

/**
 * @param {string | null | undefined} accessoryId
 * @returns {{ chipClass: string, iconClass: string } | null}
 */
export function getTreasureAccessoryChipVisual(accessoryId) {
  const id = String(accessoryId ?? "").trim();
  if (id === TREASURE_ACCESSORY_FIRE) {
    return { chipClass: "treasure-accessory-chip--fire", iconClass: "ri-fire-fill" };
  }
  if (id === TREASURE_ACCESSORY_DROP) {
    return { chipClass: "treasure-accessory-chip--drop", iconClass: "ri-drop-fill" };
  }
  if (id === TREASURE_ACCESSORY_WRENCH) {
    return { chipClass: "treasure-accessory-chip--wrench", iconClass: "ri-wrench-fill" };
  }
  if (id === TREASURE_ACCESSORY_CROP) {
    return { chipClass: "treasure-accessory-chip--crop", iconClass: "ri-crop-2-fill" };
  }
  return null;
}

/**
 * @param {string | null | undefined} accessoryId
 * @returns {string}
 */
export function getTreasureAccessoryPanelTitle(accessoryId) {
  return getTreasureAccessoryPanelTitleFromConcept(accessoryId);
}

/**
 * @param {string | null | undefined} accessoryId
 * @returns {string}
 */
export function getTreasureAccessoryPanelDescription(accessoryId) {
  return getTreasureAccessoryPanelDescriptionFromConcept(accessoryId);
}
