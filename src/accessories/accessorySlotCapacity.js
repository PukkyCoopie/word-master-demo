/**
 * 裁剪配饰：宝藏栏位扩展（非计分效果）。
 */
import { ACCESSORY_CROP } from "./accessoryCatalog.js";
import { readTreasureAccessoryIds } from "./accessoryState.js";

/** 无裁剪配饰时的默认已拥有宝藏栏位数 */
export const BASE_TREASURE_SLOT_COUNT = 6;

/**
 * @param {readonly string[]} keys
 * @returns {string}
 */
export function nextUniqueOwnedTreasureSlotKey(keys) {
  const arr = Array.isArray(keys) ? keys : [];
  let n = arr.length;
  const used = new Set(arr);
  while (used.has(`g-slot-${n}`)) n += 1;
  return `g-slot-${n}`;
}

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
  const extra = Math.floor(Number(voucherExtraSlots) || 0);
  const baseTarget = BASE_TREASURE_SLOT_COUNT + bonus + extra;
  return Math.max(Math.max(1, baseTarget), filled);
}

/**
 * @param {string | readonly string[] | null | undefined} incomingAccessoryIds
 * @returns {string[]}
 */
function normalizeIncomingTreasureAccessoryIds(incomingAccessoryIds) {
  if (Array.isArray(incomingAccessoryIds)) {
    return incomingAccessoryIds.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  const single = incomingAccessoryIds != null ? String(incomingAccessoryIds).trim() : "";
  return single ? [single] : [];
}

/**
 * @param {readonly (null | { accessoryId?: string | null, treasureAccessoryId?: string | null })[]} ownedSlots
 * @param {number} [voucherExtraSlots=0]
 * @param {string | readonly string[] | null | undefined} incomingAccessoryIds
 */
export function willIncomingTreasureAccessoriesExpandSlots(
  ownedSlots,
  voucherExtraSlots,
  incomingAccessoryIds,
) {
  for (const id of normalizeIncomingTreasureAccessoryIds(incomingAccessoryIds)) {
    if (willCropAccessoryExpandSlots(ownedSlots, voucherExtraSlots, id)) return true;
  }
  return false;
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
 * 移除指定槽位并向前压实（仅非自毁路径保留；自毁应留空位）。
 * @param {Array<object | null>} slots
 * @param {number} removedIndex
 * @returns {boolean}
 */
export function compactOwnedTreasureSlotsAtIndex(slots, removedIndex) {
  const ix = Math.floor(Number(removedIndex));
  if (!Array.isArray(slots) || !Number.isFinite(ix) || ix < 0 || ix >= slots.length) return false;
  slots.splice(ix, 1);
  return true;
}

/**
 * 摧毁后保留空位；若栏长超出裁剪配饰允许的槽位上限，将超出段的宝藏移入左侧空位并裁掉尾部空槽。
 * @param {Array<object | null>} slots
 * @param {string[]} [keys]
 * @param {number} [voucherExtraSlots=0]
 * @returns {boolean}
 */
export function reconcileOwnedTreasureSlotsAfterDestruction(slots, keys, voucherExtraSlots = 0) {
  if (!Array.isArray(slots) || slots.length === 0) return false;
  let changed = false;
  const extra = Math.floor(Number(voucherExtraSlots) || 0);

  for (;;) {
    const target = computeOwnedTreasureSlotTargetLength(slots, extra);
    if (slots.length <= target) break;

    let moved = false;
    for (let i = slots.length - 1; i >= target; i -= 1) {
      if (slots[i] == null) continue;
      const hole = slots.findIndex((s, j) => j < target && s == null);
      if (hole < 0) break;
      slots[hole] = slots[i];
      slots[i] = null;
      moved = true;
      changed = true;
    }

    while (slots.length > target && slots[slots.length - 1] == null) {
      slots.pop();
      if (Array.isArray(keys) && keys.length > 0) keys.pop();
      changed = true;
    }

    if (!moved) break;
  }

  if (Array.isArray(keys)) {
    while (keys.length < slots.length) keys.push(nextUniqueOwnedTreasureSlotKey(keys));
    while (keys.length > slots.length) keys.pop();
  }

  return changed;
}

/**
 * @param {readonly (null | { accessoryId?: string | null, treasureAccessoryId?: string | null })[]} ownedSlots
 * @param {number} [voucherExtraSlots=0]
 * @param {string | null | undefined} [incomingAccessoryId]
 */
export function canAcquireTreasureOffer(ownedSlots, voucherExtraSlots, incomingAccessoryIds) {
  const arr = Array.isArray(ownedSlots) ? ownedSlots : [];
  if (arr.some((s) => s == null)) return true;
  return willIncomingTreasureAccessoriesExpandSlots(arr, voucherExtraSlots, incomingAccessoryIds);
}
