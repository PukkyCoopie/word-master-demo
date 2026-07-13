/**
 * 效果耗尽 / 栏位 bank 实时解析：仅对已装备在宝藏栏的实例生效。
 * @param {object | null | undefined} ownedSlot
 * @param {number | null | undefined} slotIndex
 * @param {object[] | null | undefined} ownedTreasureInstances
 */
export function isOwnedTreasureBarSlotContext(ownedSlot, slotIndex, ownedTreasureInstances) {
  if (!ownedSlot || typeof ownedSlot !== "object") return false;
  if (!Array.isArray(ownedTreasureInstances)) return false;
  const physicalIndex = ownedTreasureInstances.indexOf(ownedSlot);
  if (physicalIndex < 0) return false;
  if (slotIndex != null && Number.isFinite(Number(slotIndex))) {
    return Math.floor(Number(slotIndex)) === physicalIndex;
  }
  return true;
}
