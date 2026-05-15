import {
  TREASURE_ACCESSORY_DROP,
  TREASURE_ACCESSORY_FIRE,
  TREASURE_ACCESSORY_WRENCH,
} from "../game/treasureAccessories.js";

/**
 * 已装备具名配饰（火焰/水滴/扳手）：在字后宝藏步中注入的结算增量；裁剪配饰仅扩栏位、无计分步。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {(string | null | undefined)[]} ownedSlotTreasureAccessoryIds 与槽位同索引
 * @returns {{ treasureId: null, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number }[]}
 */
export function buildTreasureAccessoryPostLetterSteps(ownedSlotTreasureIds, ownedSlotTreasureAccessoryIds) {
  const ids = Array.isArray(ownedSlotTreasureIds) ? ownedSlotTreasureIds : [];
  const aids = Array.isArray(ownedSlotTreasureAccessoryIds) ? ownedSlotTreasureAccessoryIds : [];
  const n = Math.max(ids.length, aids.length);
  /** @type {{ treasureId: null, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number }[]} */
  const steps = [];
  for (let si = 0; si < n; si += 1) {
    const tid = ids[si];
    const aid = String(aids[si] ?? "").trim();
    if (!tid || aid === "") continue;
    if (aid === TREASURE_ACCESSORY_FIRE) {
      steps.push({ treasureId: null, slotIndex: si, multAdd: 10 });
    } else if (aid === TREASURE_ACCESSORY_DROP) {
      steps.push({ treasureId: null, slotIndex: si, scoreAdd: 50 });
    } else if (aid === TREASURE_ACCESSORY_WRENCH) {
      steps.push({ treasureId: null, slotIndex: si, multMul: 1.5 });
    }
  }
  return steps;
}
