/**
 * 配饰读写与旧双字段（accessoryId / treasureAccessoryId）兼容层。
 * 对外逻辑统一用 `readEntityAccessory`；写入仍按 legacyStorage 落位，保证存档与 UI 表现不变。
 */
import { getAccessoryDef } from "./accessoryResolve.js";

/**
 * 从实体读取有效配饰 id（棋盘配饰字段优先，与旧互斥规则一致）。
 * @param {{ accessoryId?: unknown, treasureAccessoryId?: unknown } | null | undefined} entity
 * @returns {string | null}
 */
export function readEntityAccessory(entity) {
  const acc = entity?.accessoryId != null ? String(entity.accessoryId).trim() : "";
  const tAcc = entity?.treasureAccessoryId != null ? String(entity.treasureAccessoryId).trim() : "";
  if (acc) return acc;
  if (tAcc) return tAcc;
  return null;
}

/**
 * 字母块配饰互斥：同一牌张/格子最多保留一种配饰（棋盘字段优先）。
 * @param {unknown} accessoryId
 * @param {unknown} treasureAccessoryId
 * @returns {{ accessoryId: string | null, treasureAccessoryId: string | null }}
 */
export function normalizeExclusiveTileAccessoryPair(accessoryId, treasureAccessoryId) {
  const acc = accessoryId != null ? String(accessoryId).trim() : "";
  const tAcc = treasureAccessoryId != null ? String(treasureAccessoryId).trim() : "";
  const effectiveId = acc || tAcc;
  if (!effectiveId) return { accessoryId: null, treasureAccessoryId: null };
  // 互斥：双字段均有值时沿用旧规则，棋盘字段优先；再按 catalog.legacyStorage 落位
  if (acc && tAcc) return accessoryIdToLegacyTwinFields(acc);
  return accessoryIdToLegacyTwinFields(effectiveId);
}

/**
 * 将单一配饰 id 写入实体（按 catalog.legacyStorage 选择字段）。
 * @param {Record<string, unknown>} entity
 * @param {string | null | undefined} accessoryId
 * @param {'tile' | 'treasure'} [target='tile']
 */
export function writeEntityAccessory(entity, accessoryId, target = "tile") {
  const id = accessoryId != null ? String(accessoryId).trim() : "";
  if (!id) {
    entity.accessoryId = null;
    entity.treasureAccessoryId = null;
    return;
  }
  const def = getAccessoryDef(id);
  if (!def || !def.scopes.includes(target)) {
    entity.accessoryId = null;
    entity.treasureAccessoryId = null;
    return;
  }
  if (def.legacyStorage === "board") {
    entity.accessoryId = id;
    entity.treasureAccessoryId = null;
    return;
  }
  entity.accessoryId = null;
  entity.treasureAccessoryId = id;
}

/**
 * 从单一 id 生成旧式双字段（供 LetterTile / 存档序列化等仍使用双 prop 的路径）。
 * @param {string | null | undefined} accessoryId
 * @returns {{ accessoryId: string | null, treasureAccessoryId: string | null }}
 */
export function accessoryIdToLegacyTwinFields(accessoryId) {
  const id = accessoryId != null ? String(accessoryId).trim() : "";
  if (!id) return { accessoryId: null, treasureAccessoryId: null };
  const def = getAccessoryDef(id);
  if (!def) return { accessoryId: id, treasureAccessoryId: null };
  if (def.legacyStorage === "board") return { accessoryId: id, treasureAccessoryId: null };
  return { accessoryId: null, treasureAccessoryId: id };
}

/**
 * @param {{ accessoryId?: unknown, treasureAccessoryId?: unknown } | null | undefined} entity
 * @returns {boolean}
 */
export function entityHasAccessory(entity) {
  return readEntityAccessory(entity) != null;
}

/**
 * @param {{ materialId?: string | null, accessoryId?: string | null, treasureAccessoryId?: string | null }} mods
 */
export function deckTileOfferHasAccessoryGain(mods) {
  if (!mods || typeof mods !== "object") return false;
  return entityHasAccessory(mods) || String(mods.materialId ?? "").trim() !== "";
}

/**
 * 单个已拥有宝藏可同时装备的配饰上限。
 */
export const TREASURE_ACCESSORY_SLOT_CAP = 4;

/**
 * 从宝藏实体读取配饰 id 列表。
 * **宝藏槽 / 宝藏 offer 权威字段为 `treasureAccessoryIds`**；单字段 `treasureAccessoryId` 仅作旧档回退。
 * 字母块上的 `treasureAccessoryId`（与 `accessoryId` twin）不走本函数。
 * @param {{ treasureAccessoryIds?: unknown, treasureAccessoryId?: unknown } | null | undefined} entity
 * @returns {string[]}
 */
export function readTreasureAccessoryIds(entity) {
  if (!entity || typeof entity !== "object") return [];
  const rawArr = entity.treasureAccessoryIds;
  if (Array.isArray(rawArr)) {
    const out = [];
    for (const item of rawArr) {
      const id = item != null ? String(item).trim() : "";
      if (id && !out.includes(id)) out.push(id);
    }
    if (out.length) return out;
  }
  const legacy = entity.treasureAccessoryId != null ? String(entity.treasureAccessoryId).trim() : "";
  return legacy ? [legacy] : [];
}

/**
 * 将配饰 id 列表写入宝藏实体（权威写入入口）。
 * 禁止业务侧单独赋值 `treasureAccessoryId` 作为宝藏配饰写入；本函数会把单字段同步为 `ids[0]` 派生镜像。
 * 写入时截断至 {@link TREASURE_ACCESSORY_SLOT_CAP}。
 * @param {Record<string, unknown>} entity
 * @param {readonly string[]} accessoryIds
 */
export function writeTreasureAccessoryIds(entity, accessoryIds) {
  const ids = [];
  for (const item of accessoryIds ?? []) {
    const id = item != null ? String(item).trim() : "";
    if (!id || ids.includes(id)) continue;
    const def = getAccessoryDef(id);
    if (!def || !def.scopes.includes("treasure")) continue;
    ids.push(id);
    if (ids.length >= TREASURE_ACCESSORY_SLOT_CAP) break;
  }
  entity.treasureAccessoryIds = ids;
  entity.treasureAccessoryId = ids[0] ?? null;
}

/**
 * @param {Record<string, unknown>} entity
 * @param {string | null | undefined} accessoryId
 * @returns {boolean} 是否实际写入
 */
export function addTreasureAccessory(entity, accessoryId) {
  const id = accessoryId != null ? String(accessoryId).trim() : "";
  if (!id) return false;
  const ids = readTreasureAccessoryIds(entity);
  if (ids.includes(id)) return false;
  if (ids.length >= TREASURE_ACCESSORY_SLOT_CAP) return false;
  writeTreasureAccessoryIds(entity, [...ids, id]);
  return true;
}

/**
 * @param {{ treasureAccessoryIds?: unknown, treasureAccessoryId?: unknown } | null | undefined} entity
 * @param {string | null | undefined} accessoryId
 */
export function treasureHasAccessory(entity, accessoryId) {
  const id = accessoryId != null ? String(accessoryId).trim() : "";
  if (!id) return false;
  return readTreasureAccessoryIds(entity).includes(id);
}

/**
 * 读档 / 购买后规范化宝藏槽配饰字段（升成 `treasureAccessoryIds`，单字段为派生镜像）。
 * @param {Record<string, unknown> | null | undefined} slot
 */
export function normalizeOwnedTreasureSlot(slot) {
  if (!slot || typeof slot !== "object") return slot;
  writeTreasureAccessoryIds(slot, readTreasureAccessoryIds(slot));
  if (slot.hourglassStagesElapsed != null) {
    slot.hourglassStagesElapsed = Math.max(0, Math.floor(Number(slot.hourglassStagesElapsed) || 0));
  }
  if (slot.treasureAccessoryExpired != null) {
    slot.treasureAccessoryExpired = slot.treasureAccessoryExpired === true;
  }
  return slot;
}

/**
 * 商店 offer / 宝藏包行：从 offer 对象读取配饰列表。
 * @param {{ treasureAccessoryIds?: unknown, treasureAccessoryId?: unknown } | null | undefined} offer
 * @returns {string[]}
 */
export function readTreasureOfferAccessoryIds(offer) {
  return readTreasureAccessoryIds(offer);
}
