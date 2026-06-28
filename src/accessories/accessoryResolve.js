/**
 * 配饰查询：定义、范围、角标、文案、掷骰池。
 */
import {
  ACCESSORY_CATALOG,
  ALL_ACCESSORY_IDS,
  ACCESSORY_CROP,
  ACCESSORY_DROP,
  ACCESSORY_FIRE,
  ACCESSORY_HOURGLASS,
  ACCESSORY_NO_SELL,
  ACCESSORY_RENTAL,
  ACCESSORY_WRENCH,
  DECK_TILE_BOARD_ACCESSORY_CHANCE,
  SHOP_TREASURE_ACCESSORY_CHANCE,
} from "./accessoryCatalog.js";
import {
  getTileAccessoryEffectDescription,
  getTileBoardAccessoryTitle,
  getTreasureAccessoryPanelDescription,
  getTreasureAccessoryPanelTitle,
} from "../game/gameConceptCopy.js";

/** 牌包 Edition 掷骰顺序（与旧 `rollDeckTileTreasureAccessoryId` 一致：扳手 → 火焰 → 水滴） */
const DECK_TILE_EDITION_ROLL_ORDER = Object.freeze([
  ACCESSORY_WRENCH,
  ACCESSORY_FIRE,
  ACCESSORY_DROP,
]);

/** 货架宝藏配饰掷骰顺序（与旧 `rollShopTreasureAccessoryId` 一致） */
const SHOP_TREASURE_ACCESSORY_ROLL_ORDER = Object.freeze([
  ACCESSORY_FIRE,
  ACCESSORY_DROP,
  ACCESSORY_WRENCH,
  ACCESSORY_CROP,
]);

/** @param {string | null | undefined} raw */
function normId(raw) {
  return String(raw ?? "").trim();
}

/**
 * @param {string | null | undefined} id
 * @returns {import('./accessoryCatalog.js').AccessoryDef | null}
 */
export function getAccessoryDef(id) {
  const key = normId(id);
  if (!key) return null;
  return ACCESSORY_CATALOG[key] ?? null;
}

/**
 * @param {string | null | undefined} id
 * @param {AccessoryScope} target
 */
export function accessoryCanEquip(id, target) {
  const def = getAccessoryDef(id);
  if (!def) return false;
  return def.scopes.includes(target);
}

/**
 * @param {string | null | undefined} id
 * @returns {{ chipClass: string, iconClass: string } | null}
 */
export function getAccessoryChipVisual(id) {
  return getAccessoryDef(id)?.chip ?? null;
}

/**
 * 棋盘专用配饰角标（legacyStorage === board）。
 * @param {string | null | undefined} id
 */
export function getBoardStoredAccessoryChipVisual(id) {
  const def = getAccessoryDef(id);
  if (!def || def.legacyStorage !== "board") return null;
  return def.chip;
}

/**
 * 宝藏字段配饰角标（legacyStorage === treasure_field）。
 * @param {string | null | undefined} id
 */
export function getTreasureFieldAccessoryChipVisual(id) {
  const def = getAccessoryDef(id);
  if (!def || def.legacyStorage !== "treasure_field") return null;
  return def.chip;
}

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function getAccessoryTitle(id) {
  const key = normId(id);
  if (!key) return "";
  const def = getAccessoryDef(key);
  if (!def) return "";
  if (def.legacyStorage === "board") return getTileBoardAccessoryTitle(key);
  return getTreasureAccessoryPanelTitle(key);
}

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function getAccessoryDescription(id) {
  const key = normId(id);
  if (!key) return "";
  const def = getAccessoryDef(key);
  if (!def) return "";
  if (def.legacyStorage === "board") return getTileAccessoryEffectDescription(key) ?? "";
  return getTreasureAccessoryPanelDescription(key);
}

/**
 * @param {AccessoryRollPool} pool
 * @returns {readonly string[]}
 */
export function getAccessoryIdsForRollPool(pool) {
  return ALL_ACCESSORY_IDS.filter((id) => {
    const roll = ACCESSORY_CATALOG[id]?.roll;
    if (!roll) return false;
    if (pool === "deckTileBoard") return roll.deckTileBoard === true;
    if (pool === "deckTileEdition") return (roll.deckTileEditionWeight ?? 0) > 0;
    if (pool === "treasureShop") return (roll.treasureShopWeight ?? 0) > 0;
    return false;
  });
}

/**
 * @param {() => number} rng
 * @returns {string | null}
 */
export function rollDeckTileBoardAccessoryId(rng) {
  if (typeof rng !== "function" || rng() >= DECK_TILE_BOARD_ACCESSORY_CHANCE) return null;
  const pool = getAccessoryIdsForRollPool("deckTileBoard");
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

/**
 * @param {() => number} rng
 * @param {number} [honeAccessoryMult=1]
 * @returns {string | null}
 */
export function rollDeckTileEditionAccessoryId(rng, honeAccessoryMult = 1) {
  if (typeof rng !== "function") return null;
  const m = Math.min(4, Math.max(1, Number(honeAccessoryMult) || 1));
  let cumulative = 0;
  const tiers = DECK_TILE_EDITION_ROLL_ORDER.map((id) => {
    const w = (ACCESSORY_CATALOG[id]?.roll?.deckTileEditionWeight ?? 0) * m;
    cumulative += w;
    return { id, threshold: cumulative };
  });
  if (cumulative <= 0) return null;
  const u = rng();
  for (const tier of tiers) {
    if (u < tier.threshold) return tier.id;
  }
  return null;
}

/**
 * @param {string | null | undefined} id
 * @returns {boolean} 商店宝藏掷骰池内的增益配饰（火焰/水滴/扳手/裁剪等；不含租赁/沙漏/禁售）
 */
export function isTreasureShopGainAccessoryId(id) {
  const key = normId(id);
  if (!key) return false;
  return (ACCESSORY_CATALOG[key]?.roll?.treasureShopWeight ?? 0) > 0;
}

/**
 * 必定掷出一枚商店增益配饰（跳过概率门）。
 * @param {() => number} [rng=Math.random]
 * @returns {string}
 */
export function rollShopTreasureGainAccessoryId(rng = Math.random) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  const u = rnd() * 100;
  let t = 0;
  for (const id of SHOP_TREASURE_ACCESSORY_ROLL_ORDER) {
    t += ACCESSORY_CATALOG[id]?.roll?.treasureShopWeight ?? 0;
    if (u < t) return id;
  }
  return SHOP_TREASURE_ACCESSORY_ROLL_ORDER[SHOP_TREASURE_ACCESSORY_ROLL_ORDER.length - 1] ?? ACCESSORY_FIRE;
}

/**
 * @param {() => number} [rng=Math.random]
 * @param {number} [chanceMult=1]
 * @returns {string | null}
 */
export function rollShopTreasureAccessoryId(rng = Math.random, chanceMult = 1) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  const mult = Math.max(0, Number(chanceMult) || 1);
  const p = Math.min(1, SHOP_TREASURE_ACCESSORY_CHANCE * mult);
  if (rnd() >= p) return null;
  const u = rnd() * 100;
  let t = 0;
  for (const id of SHOP_TREASURE_ACCESSORY_ROLL_ORDER) {
    t += ACCESSORY_CATALOG[id]?.roll?.treasureShopWeight ?? 0;
    if (u < t) return id;
  }
  return SHOP_TREASURE_ACCESSORY_ROLL_ORDER[SHOP_TREASURE_ACCESSORY_ROLL_ORDER.length - 1] ?? null;
}

/** 禁售 / 沙漏 / 租赁配饰不参与商店标价加成 */
const TREASURE_ACCESSORY_NO_SHOP_PRICE_ADD_IDS = new Set([
  ACCESSORY_NO_SELL,
  ACCESSORY_HOURGLASS,
  ACCESSORY_RENTAL,
]);

/**
 * @param {string | null | undefined} accessoryId
 * @returns {boolean}
 */
export function treasureAccessoryContributesShopPriceAdd(accessoryId) {
  const key = normId(accessoryId);
  return Boolean(key) && !TREASURE_ACCESSORY_NO_SHOP_PRICE_ADD_IDS.has(key);
}

/**
 * @param {string | null | undefined} accessoryId
 * @returns {number}
 */
export function getShopTreasureAccessoryPriceAdd(accessoryId) {
  if (!treasureAccessoryContributesShopPriceAdd(accessoryId)) return 0;
  const def = getAccessoryDef(accessoryId);
  return def?.roll?.shopPriceAdd ?? 0;
}

/**
 * @param {readonly string[]} accessoryIds
 * @returns {number}
 */
export function getShopTreasureAccessoryPriceAddFromIds(accessoryIds) {
  let sum = 0;
  for (const id of accessoryIds ?? []) {
    sum += getShopTreasureAccessoryPriceAdd(id);
  }
  return sum;
}
