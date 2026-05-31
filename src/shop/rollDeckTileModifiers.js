/**
 * 商店 / 牌包字母块随机增益（对齐 [Balatro Playing Cards Appearance Rates](https://balatrowiki.org/w/Card_Modifiers)，无券基准）。
 *
 * - 材质 ≈ Enhancement：40%（池内均匀）
 * - 宝藏配饰（火焰/水滴/扳手）≈ Edition：Foil 4% + Holo 2.8% + Poly 1.2%（宝石券 Hone/Glow Up 倍率；裁剪仅宝藏槽）
 * - 棋盘配饰 ≈ Seal：20%（四种均匀）
 *
 * 材质与配饰独立掷骰；普通配饰与宝藏配饰互斥（若同时命中，保留普通配饰）。
 * 配饰定义与掷骰池见 `accessories/accessoryCatalog.js`。
 */
import { DECK_TILE_BOARD_ACCESSORY_CHANCE } from "../accessories/accessoryCatalog.js";
import {
  getAccessoryTitle,
  rollDeckTileBoardAccessoryId,
  rollDeckTileEditionAccessoryId,
} from "../accessories/accessoryResolve.js";
import {
  deckTileOfferHasAccessoryGain,
  normalizeExclusiveTileAccessoryPair,
} from "../accessories/accessoryState.js";
import { getTileMaterialBlockTitle } from "../game/gameConceptCopy.js";
import { SHOP_TILE_PACK_MATERIAL_IDS } from "./shopPackEconomy.js";

/** Balatro Enhancement（材质） */
export const DECK_TILE_MATERIAL_CHANCE = 0.4;

/** Balatro Seal（棋盘配饰） */
export { DECK_TILE_BOARD_ACCESSORY_CHANCE };

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

/** @deprecated 请用 `rollDeckTileEditionAccessoryId` */
export const rollDeckTileTreasureAccessoryId = rollDeckTileEditionAccessoryId;

export { rollDeckTileBoardAccessoryId };

/**
 * @param {{ materialId?: string | null, accessoryId?: string | null, treasureAccessoryId?: string | null }} mods
 */
export function deckTileOfferHasGain(mods) {
  return deckTileOfferHasAccessoryGain(mods);
}

/**
 * @param {() => number} rng
 * @param {{ honeAccessoryMult?: number, materialIds?: readonly string[], allowModifiers?: boolean }} [opts]
 */
export function rollDeckTileModifiers(rng, opts = {}) {
  if (opts.allowModifiers === false) {
    return { materialId: null, treasureAccessoryId: null, accessoryId: null };
  }
  const hone = opts.honeAccessoryMult ?? 1;
  const mats = opts.materialIds ?? SHOP_TILE_PACK_MATERIAL_IDS;
  const treasureAccessoryId = rollDeckTileEditionAccessoryId(rng, hone);
  const accessoryId = rollDeckTileBoardAccessoryId(rng);
  return {
    materialId: rollDeckTileMaterialId(rng, mats),
    treasureAccessoryId: accessoryId ? null : treasureAccessoryId,
    accessoryId: accessoryId || null,
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
  if (tAcc) parts.push(getAccessoryTitle(tAcc) || tAcc);
  const bAcc = mods.accessoryId != null ? String(mods.accessoryId).trim() : "";
  if (bAcc) parts.push(getAccessoryTitle(bAcc) || bAcc);
  const name = parts.length ? `${parts.join(" · ")} · ${letterDisp}` : `字母 ${letterDisp}`;
  const descParts = [];
  if (mat) descParts.push(`「${getTileMaterialBlockTitle(mat) || mat}」材质`);
  if (tAcc) descParts.push(`「${getAccessoryTitle(tAcc) || tAcc}」`);
  if (bAcc) descParts.push(`「${getAccessoryTitle(bAcc) || bAcc}」`);
  const description = descParts.length
    ? `${descParts.join("、")}的「${letterDisp}」加入牌库`
    : `「${letterDisp}」加入牌库${mods.rarityLabel ? `（${mods.rarityLabel}）` : ""}`;
  return { name, description };
}

export { normalizeExclusiveTileAccessoryPair };
