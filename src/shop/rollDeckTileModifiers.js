/**
 * 商店 / 牌包字母块随机增益（对齐 [Balatro Playing Cards Appearance Rates](https://balatrowiki.org/w/Card_Modifiers)，无券基准）。
 *
 * - 材质 ≈ Enhancement：40%（池内均匀）
 * - 宝藏配饰（火焰/水滴/扳手）≈ Edition：Foil 4% + Holo 2.8% + Poly 1.2%（宝石券 Hone/Glow Up 倍率；裁剪仅宝藏槽）
 * - 棋盘配饰 ≈ Seal：20%（四种均匀）
 *
 * 三者独立掷骰，可与材质、彼此叠加。
 */
import {
  TREASURE_ACCESSORY_DROP,
  TREASURE_ACCESSORY_FIRE,
  TREASURE_ACCESSORY_WRENCH,
} from "../game/treasureAccessories.js";
import {
  getTileBoardAccessoryTitle,
  getTileMaterialBlockTitle,
  getTreasureAccessoryPanelTitle,
} from "../game/gameConceptCopy.js";
import {
  TILE_ACCESSORY_COIN,
  TILE_ACCESSORY_LEVEL_UPGRADE,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_VIP_DIAMOND,
} from "../game/tileAccessories.js";
import { SHOP_TILE_PACK_MATERIAL_IDS } from "./shopPackEconomy.js";

/** Balatro Enhancement（材质） */
export const DECK_TILE_MATERIAL_CHANCE = 0.4;

/** Balatro Seal（棋盘配饰） */
export const DECK_TILE_BOARD_ACCESSORY_CHANCE = 0.2;

/** Balatro Edition 分档（无券）；对应水滴 / 火焰 / 扳手 */
const EDITION_RATE_DROP = 0.04;
const EDITION_RATE_FIRE = 0.028;
const EDITION_RATE_WRENCH = 0.012;

const TILE_BOARD_ACC_POOL = Object.freeze([
  TILE_ACCESSORY_LEVEL_UPGRADE,
  TILE_ACCESSORY_VIP_DIAMOND,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_COIN,
]);

/**
 * @param {() => number} rng
 * @param {readonly string[]} [materialIds]
 * @returns {string | null}
 */
export function rollDeckTileMaterialId(rng, materialIds = SHOP_TILE_PACK_MATERIAL_IDS) {
  if (typeof rng !== "function" || rng() >= DECK_TILE_MATERIAL_CHANCE) return null;
  const ids = [...(materialIds ?? SHOP_TILE_PACK_MATERIAL_IDS)];
  if (!ids.length) return null;
  return ids[Math.floor(rng() * ids.length)] ?? null;
}

/**
 * @param {() => number} rng
 * @param {number} [honeAccessoryMult=1] 宝石券：2× / 4×
 * @returns {string | null}
 */
export function rollDeckTileTreasureAccessoryId(rng, honeAccessoryMult = 1) {
  if (typeof rng !== "function") return null;
  const m = Math.min(4, Math.max(1, Number(honeAccessoryMult) || 1));
  const poly = EDITION_RATE_WRENCH * m;
  const holo = EDITION_RATE_FIRE * m;
  const foil = EDITION_RATE_DROP * m;
  const u = rng();
  if (u < poly) return TREASURE_ACCESSORY_WRENCH;
  if (u < poly + holo) return TREASURE_ACCESSORY_FIRE;
  if (u < poly + holo + foil) return TREASURE_ACCESSORY_DROP;
  return null;
}

/**
 * @param {() => number} rng
 * @returns {string | null}
 */
export function rollDeckTileBoardAccessoryId(rng) {
  if (typeof rng !== "function" || rng() >= DECK_TILE_BOARD_ACCESSORY_CHANCE) return null;
  return TILE_BOARD_ACC_POOL[Math.floor(rng() * TILE_BOARD_ACC_POOL.length)] ?? null;
}

/**
 * @param {() => number} rng
 * @param {{ honeAccessoryMult?: number, materialIds?: readonly string[] }} [opts]
 */
export function rollDeckTileModifiers(rng, opts = {}) {
  const hone = opts.honeAccessoryMult ?? 1;
  const mats = opts.materialIds ?? SHOP_TILE_PACK_MATERIAL_IDS;
  return {
    materialId: rollDeckTileMaterialId(rng, mats),
    treasureAccessoryId: rollDeckTileTreasureAccessoryId(rng, hone),
    accessoryId: rollDeckTileBoardAccessoryId(rng),
  };
}

/**
 * @param {string} letterDisp
 * @param {{ materialId?: string | null, treasureAccessoryId?: string | null, accessoryId?: string | null, rarityLabel?: string }} mods
 */
export function buildDeckTileOfferDisplay(letterDisp, mods) {
  const parts = [];
  const mat = mods.materialId != null ? String(mods.materialId).trim() : "";
  if (mat) parts.push(getTileMaterialBlockTitle(mat) || mat);
  const tAcc = mods.treasureAccessoryId != null ? String(mods.treasureAccessoryId).trim() : "";
  if (tAcc) parts.push(getTreasureAccessoryPanelTitle(tAcc) || tAcc);
  const bAcc = mods.accessoryId != null ? String(mods.accessoryId).trim() : "";
  if (bAcc) parts.push(getTileBoardAccessoryTitle(bAcc) || bAcc);
  const name = parts.length ? `${parts.join(" · ")} · ${letterDisp}` : `字母 ${letterDisp}`;
  const descParts = [];
  if (mat) descParts.push(`「${getTileMaterialBlockTitle(mat) || mat}」材质`);
  if (tAcc) descParts.push(`「${getTreasureAccessoryPanelTitle(tAcc) || tAcc}」`);
  if (bAcc) descParts.push(`「${getTileBoardAccessoryTitle(bAcc) || bAcc}」配饰`);
  const description = descParts.length
    ? `${descParts.join("、")}的「${letterDisp}」加入牌库`
    : `「${letterDisp}」加入牌库${mods.rarityLabel ? `（${mods.rarityLabel}）` : ""}`;
  return { name, description };
}
