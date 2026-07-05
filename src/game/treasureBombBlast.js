/**
 * 炸弹爆炸：左右紧邻非空槽位（动画用，含禁售）。
 * @param {readonly (object | null | undefined)[]} ownedSlots
 * @param {number} bombSlotIndex
 * @returns {number[]}
 */
export function resolveBombAdjacentSlotIndices(ownedSlots, bombSlotIndex) {
  const bombIx = Math.floor(Number(bombSlotIndex));
  if (!Array.isArray(ownedSlots) || !Number.isFinite(bombIx)) return [];
  /** @type {number[]} */
  const adjacent = [];
  for (const adjIx of [bombIx - 1, bombIx + 1]) {
    if (adjIx < 0 || adjIx >= ownedSlots.length) continue;
    if (ownedSlots[adjIx] == null) continue;
    adjacent.push(adjIx);
  }
  return adjacent;
}

/**
 * 炸弹爆炸：左右紧邻且会被真移除的邻槽（非禁售）。
 * @param {readonly (object | null | undefined)[]} ownedSlots
 * @param {number} bombSlotIndex
 * @param {(slotIndex: number) => boolean} [isSlotNoSell]
 * @returns {number[]}
 */
export function resolveBombAdjacentVictimSlotIndices(ownedSlots, bombSlotIndex, isSlotNoSell) {
  return resolveBombAdjacentSlotIndices(ownedSlots, bombSlotIndex).filter((ix) => !isSlotNoSell?.(ix));
}

/**
 * 炸弹爆炸：参与 wobble/气泡/缩放动画的全部槽位（邻槽 + 炸弹，含禁售）。
 * @param {readonly (object | null | undefined)[]} ownedSlots
 * @param {number} bombSlotIndex
 * @returns {number[]}
 */
export function resolveBombBlastAnimationSlotIndices(ownedSlots, bombSlotIndex) {
  const bombIx = Math.floor(Number(bombSlotIndex));
  if (!Array.isArray(ownedSlots) || !Number.isFinite(bombIx) || bombIx < 0 || bombIx >= ownedSlots.length) {
    return [];
  }
  if (ownedSlots[bombIx] == null) return [];
  return [...resolveBombAdjacentSlotIndices(ownedSlots, bombIx), bombIx];
}

/**
 * 炸弹爆炸：实际从栏位移除的槽位（禁售仅假动画，不纳入）。
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
  const adjacentDestroy = resolveBombAdjacentVictimSlotIndices(ownedSlots, bombIx, isSlotNoSell);
  if (isSlotNoSell?.(bombIx)) return adjacentDestroy;
  return [...adjacentDestroy, bombIx];
}

/**
 * 禁售槽位：假爆炸/假摧毁动画（灰底删除线气泡 + 缩回）。
 * @param {readonly (object | null | undefined)[]} ownedSlots
 * @param {number} bombSlotIndex
 * @param {(slotIndex: number) => boolean} [isSlotNoSell]
 * @returns {number[]}
 */
export function resolveBombBlastFeintSlotIndices(ownedSlots, bombSlotIndex, isSlotNoSell) {
  return resolveBombBlastAnimationSlotIndices(ownedSlots, bombSlotIndex).filter((ix) => isSlotNoSell?.(ix));
}
