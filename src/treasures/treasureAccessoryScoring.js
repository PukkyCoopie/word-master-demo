import {
  TREASURE_ACCESSORY_DROP,
  TREASURE_ACCESSORY_FIRE,
  TREASURE_ACCESSORY_WRENCH,
} from "../game/treasureAccessories.js";

/** 字母块火焰配饰：每次该字母计分时 +倍率 */
export const TILE_TREASURE_ACCESSORY_FIRE_MULT_ADD = 10;
/** 字母块水滴配饰：每次该字母计分时 +分数 */
export const TILE_TREASURE_ACCESSORY_DROP_SCORE_ADD = 50;
/** 字母块扳手配饰：每次该字母计分时 ×倍率 */
export const TILE_TREASURE_ACCESSORY_WRENCH_MULT_MUL = 1.5;

/**
 * 字母块通用宝藏配饰（火焰/水滴/扳手）：按每字母计分次数累加，与逐字动画一致。
 * 宝藏槽上同 id 配饰见 `buildTreasureAccessoryPostLetterStepForSlot`（整词计分后字后步）。
 *
 * @param {readonly { treasureAccessoryId?: string | null, bossTileDebuffed?: boolean }[]} tiles
 * @param {readonly number[]} scoringVisitCountsByLetter 与词槽对齐，每项 = 该字母本轮提交中的计分次数
 * @returns {{ scoreAdd: number, multAdd: number, multMulProduct: number }}
 */
export function accumulateTileTreasureAccessoryPerLetter(tiles, scoringVisitCountsByLetter) {
  const list = Array.isArray(tiles) ? tiles : [];
  const visits = Array.isArray(scoringVisitCountsByLetter) ? scoringVisitCountsByLetter : [];
  let scoreAdd = 0;
  let multAdd = 0;
  let multMulProduct = 1;
  for (let i = 0; i < list.length; i += 1) {
    const tile = list[i];
    if (!tile || tile.bossTileDebuffed === true) continue;
    const n = Math.max(0, Math.floor(Number(visits[i]) || 0));
    if (n <= 0) continue;
    const aid = String(tile.treasureAccessoryId ?? "").trim();
    if (aid === TREASURE_ACCESSORY_DROP) scoreAdd += TILE_TREASURE_ACCESSORY_DROP_SCORE_ADD * n;
    else if (aid === TREASURE_ACCESSORY_FIRE) multAdd += TILE_TREASURE_ACCESSORY_FIRE_MULT_ADD * n;
    else if (aid === TREASURE_ACCESSORY_WRENCH) {
      for (let k = 0; k < n; k += 1) multMulProduct *= TILE_TREASURE_ACCESSORY_WRENCH_MULT_MUL;
    }
  }
  return { scoreAdd, multAdd, multMulProduct };
}

/**
 * 单槽宝藏配饰字后步（整词字母计分结束后；无宝藏或裁剪配饰时返回 null）。
 * @param {number} slotIndex
 * @param {string | null | undefined} treasureId
 * @param {string | null | undefined} accessoryId
 * @returns {{ treasureId: null, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number } | null}
 */
export function buildTreasureAccessoryPostLetterStepForSlot(slotIndex, treasureId, accessoryId) {
  const tid = treasureId != null && treasureId !== "" ? String(treasureId) : "";
  const aid = String(accessoryId ?? "").trim();
  if (!tid || aid === "") return null;
  const si = Math.floor(Number(slotIndex)) || 0;
  if (aid === TREASURE_ACCESSORY_FIRE) {
    return { treasureId: null, slotIndex: si, multAdd: 10 };
  }
  if (aid === TREASURE_ACCESSORY_DROP) {
    return { treasureId: null, slotIndex: si, scoreAdd: 50 };
  }
  if (aid === TREASURE_ACCESSORY_WRENCH) {
    return { treasureId: null, slotIndex: si, multMul: 1.5 };
  }
  return null;
}

export function buildTreasureAccessoryPostLetterSteps(ownedSlotTreasureIds, ownedSlotTreasureAccessoryIds) {
  const ids = Array.isArray(ownedSlotTreasureIds) ? ownedSlotTreasureIds : [];
  const aids = Array.isArray(ownedSlotTreasureAccessoryIds) ? ownedSlotTreasureAccessoryIds : [];
  const n = Math.max(ids.length, aids.length);
  /** @type {{ treasureId: null, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number }[]} */
  const steps = [];
  for (let si = 0; si < n; si += 1) {
    const step = buildTreasureAccessoryPostLetterStepForSlot(si, ids[si], aids[si]);
    if (step) steps.push(step);
  }
  return steps;
}
