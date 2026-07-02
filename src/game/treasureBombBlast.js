/**
 * 炸弹爆炸：左右紧邻槽位（非空、非禁售）会被一并摧毁。
 * @param {readonly (object | null | undefined)[]} ownedSlots
 * @param {number} bombSlotIndex
 * @param {(slotIndex: number) => boolean} [isSlotNoSell]
 * @returns {number[]}
 */
export function resolveBombAdjacentVictimSlotIndices(ownedSlots, bombSlotIndex, isSlotNoSell) {
  const bombIx = Math.floor(Number(bombSlotIndex));
  if (!Array.isArray(ownedSlots) || !Number.isFinite(bombIx)) return [];
  /** @type {number[]} */
  const victims = [];
  for (const adjIx of [bombIx - 1, bombIx + 1]) {
    if (adjIx < 0 || adjIx >= ownedSlots.length) continue;
    if (ownedSlots[adjIx] == null) continue;
    if (isSlotNoSell?.(adjIx)) continue;
    victims.push(adjIx);
  }
  return victims;
}

/**
 * @param {readonly (object | null | undefined)[]} ownedSlots
 * @param {number} bombSlotIndex
 * @param {(slotIndex: number) => boolean} [isSlotNoSell]
 * @returns {number[]}
 */
export function resolveBombBlastDestroySlotIndices(ownedSlots, bombSlotIndex, isSlotNoSell) {
  const bombIx = Math.floor(Number(bombSlotIndex));
  if (!Array.isArray(ownedSlots) || !Number.isFinite(bombIx) || bombIx < 0 || bombIx >= ownedSlots.length) {
    return [];
  }
  if (ownedSlots[bombIx] == null) return [];
  if (isSlotNoSell?.(bombIx)) return [];
  return [...resolveBombAdjacentVictimSlotIndices(ownedSlots, bombIx, isSlotNoSell), bombIx];
}
