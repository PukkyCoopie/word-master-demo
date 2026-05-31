import { ACCESSORY_HOURGLASS, ACCESSORY_RENTAL } from "../accessories/accessoryCatalog.js";
import { readTreasureAccessoryIds, treasureHasAccessory } from "../accessories/accessoryState.js";

export const HOURGLASS_EXPIRE_STAGES = 5;

/** @param {Record<string, unknown> | null | undefined} slot */
export function slotHasActiveHourglass(slot) {
  if (!slot) return false;
  return treasureHasAccessory(slot, ACCESSORY_HOURGLASS) && slot.treasureAccessoryExpired !== true;
}

/**
 * @param {Record<string, unknown>} slot
 * @returns {{ kind: 'none' } | { kind: 'tick', count: number } | { kind: 'expired' }}
 */
export function incrementHourglassOnSlot(slot) {
  if (!slotHasActiveHourglass(slot)) return { kind: "none" };
  const elapsed = Math.max(0, Math.floor(Number(slot.hourglassStagesElapsed) || 0)) + 1;
  slot.hourglassStagesElapsed = elapsed;
  if (elapsed >= HOURGLASS_EXPIRE_STAGES) {
    slot.treasureAccessoryExpired = true;
    return { kind: "expired" };
  }
  return { kind: "tick", count: elapsed };
}

/**
 * @param {readonly (Record<string, unknown> | null)[]} ownedSlots
 * @returns {number}
 */
export function countOwnedRentalTreasures(ownedSlots) {
  if (!Array.isArray(ownedSlots)) return 0;
  let n = 0;
  for (const s of ownedSlots) {
    if (s && readTreasureAccessoryIds(s).includes(ACCESSORY_RENTAL)) n += 1;
  }
  return n;
}

/** @param {readonly (Record<string, unknown> | null)[]} ownedSlots */
export function getTreasureAccessoryExpiredSlotIndices(ownedSlots) {
  /** @type {number[]} */
  const out = [];
  if (!Array.isArray(ownedSlots)) return out;
  for (let i = 0; i < ownedSlots.length; i += 1) {
    if (ownedSlots[i]?.treasureAccessoryExpired === true) out.push(i);
  }
  return out;
}
