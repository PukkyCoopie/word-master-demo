/**
 * 配饰计分编排（逐字 / 字后步）；数值来自 catalog。
 */
import { ACCESSORY_COIN, ACCESSORY_REWIND } from "./accessoryCatalog.js";
import { getAccessoryDef } from "./accessoryResolve.js";
import { readEntityAccessory } from "./accessoryState.js";

/** @deprecated 保留导出名，供 GamePanel 动画引用 */
export const TILE_TREASURE_ACCESSORY_FIRE_MULT_ADD = 10;
/** @deprecated */
export const TILE_TREASURE_ACCESSORY_DROP_SCORE_ADD = 50;
/** @deprecated */
export const TILE_TREASURE_ACCESSORY_WRENCH_MULT_MUL = 1.5;

export { ACCESSORY_COIN as TILE_ACCESSORY_COIN };
export { ACCESSORY_REWIND as TILE_ACCESSORY_REWIND };

/**
 * @param {readonly { accessoryId?: string | null, treasureAccessoryId?: string | null, bossTileDebuffed?: boolean }[]} tiles
 * @param {readonly number[]} scoringVisitCountsByLetter
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
    const aid = readEntityAccessory(tile);
    const effect = getAccessoryDef(aid)?.perLetterOnTile;
    if (!effect) continue;
    if (effect.kind === "score_add") scoreAdd += effect.value * n;
    else if (effect.kind === "mult_add") multAdd += effect.value * n;
    else if (effect.kind === "mult_mul") {
      for (let k = 0; k < n; k += 1) multMulProduct *= effect.value;
    }
  }
  return { scoreAdd, multAdd, multMulProduct };
}

/**
 * @param {number} slotIndex
 * @param {string | null | undefined} treasureId
 * @param {string | null | undefined} accessoryId
 */
export function buildTreasureAccessoryPostLetterStepForSlot(slotIndex, treasureId, accessoryId) {
  const tid = treasureId != null && treasureId !== "" ? String(treasureId) : "";
  const aid = String(accessoryId ?? "").trim();
  if (!tid || aid === "") return null;
  const effect = getAccessoryDef(aid)?.postLetterOnTreasure;
  if (!effect) return null;
  const si = Math.floor(Number(slotIndex)) || 0;
  const base = { treasureId: null, slotIndex: si };
  if (effect.kind === "score_add") return { ...base, scoreAdd: effect.value };
  if (effect.kind === "mult_add") return { ...base, multAdd: effect.value };
  if (effect.kind === "mult_mul") return { ...base, multMul: effect.value };
  return null;
}

/**
 * @param {string | null | undefined} raw 单 id 或 id 数组（多配饰）
 * @returns {string[]}
 */
function normalizeSlotAccessoryIdList(raw) {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  const id = raw != null ? String(raw).trim() : "";
  return id ? [id] : [];
}

export function buildTreasureAccessoryPostLetterSteps(ownedSlotTreasureIds, ownedSlotTreasureAccessoryIds) {
  const ids = Array.isArray(ownedSlotTreasureIds) ? ownedSlotTreasureIds : [];
  const aids = Array.isArray(ownedSlotTreasureAccessoryIds) ? ownedSlotTreasureAccessoryIds : [];
  const n = Math.max(ids.length, aids.length);
  /** @type {{ treasureId: null, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number }[]} */
  const steps = [];
  for (let si = 0; si < n; si += 1) {
    const accIds = normalizeSlotAccessoryIdList(aids[si]);
    for (const aid of accIds) {
      const step = buildTreasureAccessoryPostLetterStepForSlot(si, ids[si], aid);
      if (step) steps.push(step);
    }
  }
  return steps;
}

/**
 * @param {{ accessoryId?: string | null, treasureAccessoryId?: string | null } | null | undefined} tile
 */
export function tileHasRewindAccessory(tile) {
  return readEntityAccessory(tile) === ACCESSORY_REWIND;
}
