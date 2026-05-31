/**
 * 裁剪配饰：宝藏栏位扩展（非计分效果）。
 */
import { ACCESSORY_CROP } from "./accessoryCatalog.js";
import { readTreasureAccessoryIds } from "./accessoryState.js";

/** 无裁剪配饰时的默认已拥有宝藏栏位数 */
export const BASE_TREASURE_SLOT_COUNT = 5;

/**
 * @param {readonly (null | { treasureAccessoryIds?: unknown, treasureAccessoryId?: unknown })[]} ownedSlots
 */
export function countTreasureCropSlotBonus(ownedSlots) {
  if (!Array.isArray(ownedSlots)) return 0;
  let n = 0;
  for (const s of ownedSlots) {
    if (s && readTreasureAccessoryIds(s).includes(ACCESSORY_CROP)) n += 1;
  }
  return n;
}

/**
 * @param {readonly (null | unknown)[]} ownedSlots
 * @param {number} [voucherExtraSlots=0]
 */
export function computeOwnedTreasureSlotTargetLength(ownedSlots, voucherExtraSlots = 0) {
  const arr = Array.isArray(ownedSlots) ? ownedSlots : [];
  const filled = arr.filter(Boolean).length;
  const bonus = countTreasureCropSlotBonus(arr);
  const vx = Math.max(0, Math.floor(Number(voucherExtraSlots) || 0));
  return Math.max(BASE_TREASURE_SLOT_COUNT + bonus + vx, filled);
}

/**
 * @param {readonly (null | { accessoryId?: string | null, treasureAccessoryId?: string | null })[]} ownedSlots
 * @param {number} [voucherExtraSlots=0]
 * @param {string | null | undefined} incomingAccessoryId
 */
export function willCropAccessoryExpandSlots(ownedSlots, voucherExtraSlots, incomingAccessoryId) {
  if (String(incomingAccessoryId ?? "").trim() !== ACCESSORY_CROP) return false;
  const arr = Array.isArray(ownedSlots) ? ownedSlots : [];
  const filled = arr.filter(Boolean).length;
  const projected = computeOwnedTreasureSlotTargetLength(
    [...arr.filter(Boolean), { treasureAccessoryIds: [ACCESSORY_CROP] }],
    voucherExtraSlots,
  );
  return filled < projected;
}

/**
 * @param {Array<object | null>} slots
 * @param {number} soldIndex
 * @param {{ accessoryId?: string | null, treasureAccessoryId?: string | null }} soldTreasure
 */
export function compactOwnedSlotsAfterCropSell(slots, soldIndex, soldTreasure) {
  const isCrop = readTreasureAccessoryIds(soldTreasure).includes(ACCESSORY_CROP);
  const lastHasTreasure = slots.length > 0 && slots[slots.length - 1] != null;
  if (!isCrop || !lastHasTreasure) return false;
  const ix = Math.max(0, Math.floor(Number(soldIndex) || 0));
  if (ix < 0 || ix >= slots.length) return false;
  slots.splice(ix, 1);
  return true;
}

/**
 * @param {readonly (null | { accessoryId?: string | null, treasureAccessoryId?: string | null })[]} ownedSlots
 * @param {number} [voucherExtraSlots=0]
 * @param {string | null | undefined} [incomingAccessoryId]
 */
export function canAcquireTreasureOffer(ownedSlots, voucherExtraSlots, incomingAccessoryId) {
  const arr = Array.isArray(ownedSlots) ? ownedSlots : [];
  if (arr.some((s) => s == null)) return true;
  const incomingIds = Array.isArray(incomingAccessoryId)
    ? incomingAccessoryId.map((x) => String(x ?? "").trim()).filter(Boolean)
    : incomingAccessoryId != null && String(incomingAccessoryId).trim()
      ? [String(incomingAccessoryId).trim()]
      : [];
  for (const id of incomingIds) {
    if (willCropAccessoryExpandSlots(arr, voucherExtraSlots, id)) return true;
  }
  return false;
}
