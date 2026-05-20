import { TREASURE_ACCESSORY_CROP } from "./treasureAccessories.js";

/** 无裁剪配饰时的默认已拥有宝藏栏位数 */
export const BASE_TREASURE_SLOT_COUNT = 5;

/**
 * @param {readonly (null | { treasureAccessoryId?: string | null })[]} ownedSlots
 * @returns {number}
 */
export function countTreasureCropSlotBonus(ownedSlots) {
  if (!Array.isArray(ownedSlots)) return 0;
  let n = 0;
  for (const s of ownedSlots) {
    if (s && String(s.treasureAccessoryId ?? "").trim() === TREASURE_ACCESSORY_CROP) n += 1;
  }
  return n;
}

/**
 * 目标栏位数：基础 + 裁剪加成，且不少于当前已占用格数。
 * @param {readonly (null | unknown)[]} ownedSlots
 * @param {number} [voucherExtraSlots=0] 优惠券等额外栏位（如白方块·二级 +1）
 */
export function computeOwnedTreasureSlotTargetLength(ownedSlots, voucherExtraSlots = 0) {
  const arr = Array.isArray(ownedSlots) ? ownedSlots : [];
  const filled = arr.filter(Boolean).length;
  const bonus = countTreasureCropSlotBonus(arr);
  const vx = Math.max(0, Math.floor(Number(voucherExtraSlots) || 0));
  return Math.max(BASE_TREASURE_SLOT_COUNT + bonus + vx, filled);
}

/**
 * 购入带裁剪配饰的宝藏时，即使当前无空槽也可落位（购入后裁剪会扩栏）。
 * @param {readonly (null | { treasureAccessoryId?: string | null })[]} ownedSlots
 * @param {number} [voucherExtraSlots=0]
 * @param {string | null | undefined} incomingAccessoryId
 */
export function willCropAccessoryExpandSlots(ownedSlots, voucherExtraSlots, incomingAccessoryId) {
  if (String(incomingAccessoryId ?? "").trim() !== TREASURE_ACCESSORY_CROP) return false;
  const arr = Array.isArray(ownedSlots) ? ownedSlots : [];
  const filled = arr.filter(Boolean).length;
  const projected = computeOwnedTreasureSlotTargetLength(
    [...arr.filter(Boolean), { treasureAccessoryId: TREASURE_ACCESSORY_CROP }],
    voucherExtraSlots,
  );
  return filled < projected;
}

/**
 * 卖出带裁剪配饰且末格仍有宝藏时：删除卖出格并左移后续槽位。
 * @param {Array<object | null>} slots
 * @param {number} soldIndex
 * @param {{ treasureAccessoryId?: string | null }} soldTreasure
 * @returns {boolean} 是否已 splice 压缩（调用方勿再置 null）
 */
export function compactOwnedSlotsAfterCropSell(slots, soldIndex, soldTreasure) {
  const isCrop = String(soldTreasure?.treasureAccessoryId ?? "").trim() === TREASURE_ACCESSORY_CROP;
  const lastHasTreasure = slots.length > 0 && slots[slots.length - 1] != null;
  if (!isCrop || !lastHasTreasure) return false;
  const ix = Math.max(0, Math.floor(Number(soldIndex) || 0));
  if (ix < 0 || ix >= slots.length) return false;
  slots.splice(ix, 1);
  return true;
}

/**
 * @param {readonly (null | { treasureAccessoryId?: string | null })[]} ownedSlots
 * @param {number} [voucherExtraSlots=0]
 * @param {string | null | undefined} [incomingAccessoryId]
 */
export function canAcquireTreasureOffer(ownedSlots, voucherExtraSlots, incomingAccessoryId) {
  const arr = Array.isArray(ownedSlots) ? ownedSlots : [];
  if (arr.some((s) => s == null)) return true;
  return willCropAccessoryExpandSlots(arr, voucherExtraSlots, incomingAccessoryId);
}
