import {
  normalizeOwnedTreasureSlot,
  readTreasureAccessoryIds,
  writeTreasureAccessoryIds,
} from "../accessories/accessoryState.js";
import { getShopTreasureAccessoryPriceAddFromIds } from "../accessories/accessoryResolve.js";
import { treasureOfferHasRentalAccessory } from "../game/runDifficultyRuntime.js";
import { getTreasureDef } from "./treasureRegistry.js";

const CANDLE_TREASURE_ID = "41";

/**
 * @typedef {Object} OwnedTreasureSlotPersisted
 * @property {string} treasureId
 * @property {number} [price]
 * @property {number} [sellPriceBonus] 叠在 floor(初始标价/2) 之上的额外售出额（不参与 /2）
 * @property {string[]} [treasureAccessoryIds]
 * @property {number} [hourglassStagesElapsed]
 * @property {boolean} [treasureAccessoryExpired]
 */

/**
 * @param {Record<string, unknown> | null | undefined} slot
 * @returns {number}
 */
function resolveOwnedTreasureListPrice(slot) {
  if (!slot || typeof slot !== "object") return 0;
  const tid = String(slot.treasureId ?? "").trim();
  if (!tid) return Math.max(0, Math.floor(Number(slot.price) || 0));
  const def = getTreasureDef(tid);
  if (!def) return Math.max(0, Math.floor(Number(slot.price) || 0));
  const accessoryIds = readTreasureAccessoryIds(slot);
  return defaultOwnedTreasurePrice(def, accessoryIds);
}

/**
 * @param {Record<string, unknown> | null | undefined} slot
 * @returns {number}
 */
export function computeOwnedTreasureSellRefund(slot) {
  if (!slot || typeof slot !== "object") return 0;
  const listPrice = resolveOwnedTreasureListPrice(slot);
  const bonus = Math.max(0, Math.floor(Number(slot.sellPriceBonus) || 0));
  return Math.floor(listPrice / 2) + bonus;
}

export const RENTAL_TREASURE_LIST_PRICE = 1;

/**
 * @param {import('./treasureTypes.js').TreasureDef} def
 * @param {readonly string[]} accessoryIds
 */
function defaultOwnedTreasurePrice(def, accessoryIds) {
  if (treasureOfferHasRentalAccessory(accessoryIds)) return RENTAL_TREASURE_LIST_PRICE;
  return def.price + getShopTreasureAccessoryPriceAddFromIds(accessoryIds);
}

/**
 * 由 catalog + 可变状态组装运行时槽位对象（简介/名称等静态字段始终来自当前定义）。
 * @param {OwnedTreasureSlotPersisted | Record<string, unknown> | null | undefined} input
 * @returns {Record<string, unknown> | null}
 */
export function buildOwnedTreasureSlot(input) {
  if (!input || typeof input !== "object") return null;
  const tid = String(input.treasureId ?? "").trim();
  if (!tid) return null;

  const def = getTreasureDef(tid);
  if (!def) {
    return normalizeOwnedTreasureSlot(/** @type {Record<string, unknown>} */ ({ ...input, treasureId: tid }));
  }

  const accessoryIds = readTreasureAccessoryIds(input);
  let price =
    input.price != null
      ? Math.max(0, Math.floor(Number(input.price) || 0))
      : defaultOwnedTreasurePrice(def, accessoryIds);
  let sellPriceBonus = Math.max(0, Math.floor(Number(input.sellPriceBonus) || 0));
  if (tid === CANDLE_TREASURE_ID && sellPriceBonus <= 0) {
    const basePrice = defaultOwnedTreasurePrice(def, accessoryIds);
    if (price > basePrice) {
      sellPriceBonus = price - basePrice;
      price = basePrice;
    }
  }

  /** @type {Record<string, unknown>} */
  const slot = {
    treasureId: tid,
    price,
    ...(sellPriceBonus > 0 ? { sellPriceBonus } : {}),
    rarity: def.rarity,
    name: def.name,
    emoji: def.emoji,
    description: def.description,
  };
  writeTreasureAccessoryIds(slot, accessoryIds);
  if (input.hourglassStagesElapsed != null) {
    slot.hourglassStagesElapsed = Math.max(0, Math.floor(Number(input.hourglassStagesElapsed) || 0));
  }
  if (input.treasureAccessoryExpired === true) {
    slot.treasureAccessoryExpired = true;
  }
  return normalizeOwnedTreasureSlot(slot);
}

/**
 * 存档：仅保留 id 与可变状态；静态展示字段读档时由 catalog 重建。
 * @param {Record<string, unknown> | null | undefined} slot
 * @returns {OwnedTreasureSlotPersisted | null}
 */
export function serializeOwnedTreasureSlot(slot) {
  if (!slot || typeof slot !== "object") return null;
  const tid = String(slot.treasureId ?? "").trim();
  if (!tid) return null;

  /** @type {OwnedTreasureSlotPersisted} */
  const out = { treasureId: tid };
  out.price = Math.max(0, Math.floor(Number(slot.price) || 0));
  const sellPriceBonus = Math.max(0, Math.floor(Number(slot.sellPriceBonus) || 0));
  if (sellPriceBonus > 0) out.sellPriceBonus = sellPriceBonus;

  const accessoryIds = readTreasureAccessoryIds(slot);
  if (accessoryIds.length) out.treasureAccessoryIds = [...accessoryIds];

  const elapsed = Math.floor(Number(slot.hourglassStagesElapsed) || 0);
  if (elapsed > 0) out.hourglassStagesElapsed = elapsed;

  if (slot.treasureAccessoryExpired === true) out.treasureAccessoryExpired = true;

  return out;
}

/**
 * @param {unknown} saved
 * @returns {Record<string, unknown> | null}
 */
export function hydrateOwnedTreasureSlot(saved) {
  if (saved == null || typeof saved !== "object") return null;
  return buildOwnedTreasureSlot(/** @type {Record<string, unknown>} */ (saved));
}

/**
 * @param {(Record<string, unknown> | null | undefined)[]} slots
 * @returns {(Record<string, unknown> | null)[]}
 */
export function serializeOwnedTreasureSlots(slots) {
  return (slots ?? []).map((s) => serializeOwnedTreasureSlot(s));
}

/**
 * @param {unknown[]} savedSlots
 * @returns {(Record<string, unknown> | null)[]}
 */
export function hydrateOwnedTreasureSlots(savedSlots) {
  return (savedSlots ?? []).map((s) => hydrateOwnedTreasureSlot(s));
}
