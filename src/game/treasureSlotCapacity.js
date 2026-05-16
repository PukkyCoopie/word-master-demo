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
