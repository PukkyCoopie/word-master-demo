import { deckCardRaw, syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { snapshotMaxIntrinsicGainsFromTile, applyIntrinsicGainsToTileAndLinkedCard } from "../game/tileIntrinsicGains.js";
import { getBaseScoreForRarity, getRarityForLetter, LETTER_RARITY_ORDER, RARITY_BY_LETTER } from "../composables/useScoring.js";
import { SPELL_DEFINITIONS, SPELL_IDS_EXCLUDED_FROM_DICE, getSpellDefinition } from "./spellDefinitions.js";
import {
  ALL_TREASURE_ACCESSORY_IDS,
  TREASURE_ACCESSORY_CROP,
  TREASURE_ACCESSORY_WRENCH,
  TILE_ROLLABLE_TREASURE_ACCESSORY_IDS,
} from "../game/treasureAccessories.js";
import {
  TILE_ACCESSORY_COIN,
  TILE_ACCESSORY_LEVEL_UPGRADE,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_VIP_DIAMOND,
} from "../game/tileAccessories.js";
import { applyRandomUpgradePick, rollRandomUpgradePicks } from "../shop/randomUpgradeRoll.js";
import { SHOP_TILE_PACK_MATERIAL_IDS } from "../shop/shopPackEconomy.js";
import { spellHasTag } from "./spellTags.js";
import { SPELL_TAG_SPECTRAL } from "./spellTags.js";
import { normalizeExclusiveTileAccessoryPair, writeEntityAccessory } from "../accessories/accessoryState.js";
import {
  buildOwnedTreasureSlot,
  computeOwnedTreasureSellRefund,
  serializeOwnedTreasureSlot,
} from "../treasures/ownedTreasureSlot.js";
import { ownedTreasureHasNoSellAccessory } from "../game/runDifficultyRuntime.js";

const WATER_MATERIAL_SCORE_BONUS = 30;
const FIRE_MATERIAL_MULT_BONUS = 5;
const VOWEL_SET = new Set(["a", "e", "i", "o", "u"]);

function rngU(rng) {
  const f = typeof rng === "function" ? rng : Math.random;
  return f();
}

function shuffleInPlace(arr, rng = Math.random) {
  const rnd = typeof rng === "function" ? rng : Math.random;
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** @param {unknown} tile */
export function tileLetterToRaw(tile) {
  const L = String(tile?.letter ?? "").trim();
  if (!L) return "";
  const low = L.toLowerCase();
  return low === "qu" ? "q" : low.slice(0, 1);
}

/** @param {Record<string, unknown>[][]} grid */
function collectLetterCells(grid, ROWS, COLS) {
  const out = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const t = grid[r][c];
      if (t?.letter) out.push({ row: r, col: c });
    }
  }
  return out;
}

/**
 * @param {Record<string, unknown>[][]} grid
 * @param {number} n
 * @param {() => number} [rng]
 */
export function buildRandomSpellSelection(grid, ROWS, COLS, n, rng = Math.random) {
  const pool = collectLetterCells(grid, ROWS, COLS);
  shuffleInPlace(pool, rng);
  return pool.slice(0, Math.max(0, Math.min(n, pool.length)));
}

/**
 * @param {{ row: number, col: number }[]} list
 * @returns {{ row: number, col: number }[]}
 */
function dedupeAppearancePositions(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (!p || typeof p.row !== "number" || typeof p.col !== "number") continue;
    const k = `${p.row},${p.col}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ row: p.row, col: p.col });
  }
  return out;
}

/**
 * 会改变棋盘 tile 外观（字母/材质/稀有度/饰品等）的法术：用于结算后动效目标格。
 * 在 **尚未** 执行 `applySpell` 突变前调用，读取当前 `grid`。
 *
 * @param {string} effectiveSpellId
 * @param {{ row: number, col: number }[]} ordered
 * @param {Record<string, unknown>[][]} g
 * @param {number} ROWS
 * @param {number} COLS
 * @returns {{ row: number, col: number }[]}
 */
export function getSpellTileAppearanceTargets(effectiveSpellId, ordered, g, ROWS, COLS) {
  const sid = String(effectiveSpellId ?? "");
  const ord = Array.isArray(ordered) ? ordered : [];
  /** @type {{ row: number, col: number }[]} */
  const acc = [];
  const seen = new Set();
  const add = (row, col) => {
    if (row < 0 || col < 0 || row >= ROWS || col >= COLS) return;
    const k = `${row},${col}`;
    if (seen.has(k)) return;
    if (!g[row]?.[col]?.letter) return;
    seen.add(k);
    acc.push({ row, col });
  };

  switch (sid) {
    case "cake":
    case "blaze":
    case "drinks":
    case "lightbulb":
    case "hammer":
    case "snowflake":
    case "flask":
    case "bard":
    case "mic":
    case "notification":
    case "phone":
    case "delete_back":
      for (const p of ord) add(p.row, p.col);
      break;
    case "seedling": {
      const sorted = [...ord].sort((a, b) => b.row - a.row);
      for (const p of sorted) {
        if (p.row >= ROWS - 1) continue;
        add(p.row, p.col);
        add(p.row + 1, p.col);
      }
      break;
    }
    case "file_copy":
      if (ord.length >= 2) {
        const dst = ord[0];
        const src = ord[1];
        if (g[dst.row]?.[dst.col]?.letter && g[src.row]?.[src.col]?.letter) add(dst.row, dst.col);
      }
      break;
    case "aura":
      for (const p of ord) add(p.row, p.col);
      break;
    case "ouija":
      return buildSpellAnimPickTargetsFromOrdered(ord, g);
    default:
      break;
  }
  return dedupeAppearancePositions(acc);
}

/**
 * 法术确认动效 / 快照用：与玩家 `ordered` 点选顺序一致，**保留重复棋盘坐标**（多点同一格时每一步仍占一项）。
 * `getSpellTileAppearanceTargets` 会去重坐标，不能用于此类「每点一格一条动效」的序列。
 *
 * @param {{ row?: unknown, col?: unknown, deckCardUid?: number | null }[]} ordered
 * @param {Record<string, unknown>[][]} g
 * @returns {{ row: number, col: number }[]}
 */
export function buildSpellAnimPickTargetsFromOrdered(ordered, g) {
  const list = Array.isArray(ordered) ? ordered : [];
  const rows = g.length;
  const cols = g[0]?.length ?? 0;
  /** @type {{ row: number, col: number }[]} */
  const out = [];
  for (const p of list) {
    if (!p) continue;
    const uid = p.deckCardUid;
    if (uid != null) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = g[r]?.[c];
          if (t?._deckCard?._dcUid === uid) {
            out.push({ row: r, col: c });
            break;
          }
        }
      }
      continue;
    }
    const r = Number(p.row);
    const c = Number(p.col);
    if (!Number.isFinite(r) || !Number.isFinite(c)) continue;
    const row = Math.trunc(r);
    const col = Math.trunc(c);
    if (!g[row]?.[col]?.letter) continue;
    out.push({ row, col });
  }
  return out;
}

function clearMaterialEconomy(tile) {
  tile.materialScoreBonus = 0;
  tile.materialMultBonus = 0;
  const c = tile._deckCard;
  if (c && typeof c === "object") {
    c.materialScoreBonus = 0;
    c.materialMultBonus = 0;
  }
}

/**
 * 仅改材质经济（materialId / materialScoreBonus / materialMultBonus / 非万能 isWildcard），
 * 保留 tileScoreBonus、letterMultBonus、配饰等其它持久增益。
 * @param {Record<string, unknown>} tile
 * @param {string} materialId
 * @param {SpellRuntimeContext} [ctx]
 */
function applyPlainMaterial(tile, materialId, ctx) {
  const gains = snapshotMaxIntrinsicGainsFromTile(tile);
  clearMaterialEconomy(tile);
  tile.materialId = materialId;
  if (materialId === "water") tile.materialScoreBonus = WATER_MATERIAL_SCORE_BONUS;
  if (materialId === "fire") tile.materialMultBonus = FIRE_MATERIAL_MULT_BONUS;
  if (materialId !== "wildcard") tile.isWildcard = false;
  applyIntrinsicGainsToTileAndLinkedCard(tile, gains);
  syncTileStateToDeckCard(tile);
  ctx?.onMaterialAcquired?.(String(materialId));
}

/** @param {Record<string, unknown>} tile */
function bumpTileRarityOne(tile, rarityLevelsByRarity) {
  const ri = LETTER_RARITY_ORDER.indexOf(tile.rarity);
  if (ri < 0 || ri >= LETTER_RARITY_ORDER.length - 1) return;
  const gains = snapshotMaxIntrinsicGainsFromTile(tile);
  tile.rarity = LETTER_RARITY_ORDER[ri + 1];
  tile.baseScore = getBaseScoreForRarity(tile.rarity, rarityLevelsByRarity);
  const c = tile._deckCard;
  if (c && typeof c === "object") {
    c.rarity = tile.rarity;
  }
  applyIntrinsicGainsToTileAndLinkedCard(tile, gains);
  syncTileStateToDeckCard(tile);
}

function allConsonantRaws() {
  const out = [];
  for (const letters of Object.values(RARITY_BY_LETTER)) {
    for (const x of letters) {
      if (!VOWEL_SET.has(x)) out.push(x);
    }
  }
  return out;
}

function allVowelRaws() {
  return [...VOWEL_SET];
}

function allLetterRaws() {
  const out = [];
  for (const letters of Object.values(RARITY_BY_LETTER)) {
    for (const x of letters) out.push(x);
  }
  return out;
}

function pickRandomRaw(pool, rng) {
  if (!pool.length) return "e";
  return pool[Math.floor(rngU(rng) * pool.length)];
}

/** @param {() => number} rng */
function rollForcedEnhancedMaterialId(rng) {
  const ids = SHOP_TILE_PACK_MATERIAL_IDS;
  if (!ids.length) return "lucky";
  return ids[Math.floor(rngU(rng) * ids.length)] ?? "lucky";
}

/**
 * @param {string[]} raws
 * @param {() => number} rng
 */
function buildEnhancedDeckEntries(raws, rng) {
  return raws.map((raw) => ({
    raw,
    materialId: rollForcedEnhancedMaterialId(rng),
  }));
}

const TILE_AURA_ACCESSORY_POOL = Object.freeze([
  TILE_ACCESSORY_COIN,
  TILE_ACCESSORY_REWIND,
  TILE_ACCESSORY_VIP_DIAMOND,
  TILE_ACCESSORY_LEVEL_UPGRADE,
  ...TILE_ROLLABLE_TREASURE_ACCESSORY_IDS,
]);

/** @param {Record<string, unknown>} tile @param {string} accessoryId @param {SpellRuntimeContext} [ctx] */
function applyTileBoardAccessory(tile, accessoryId, ctx) {
  const gains = snapshotMaxIntrinsicGainsFromTile(tile);
  writeEntityAccessory(tile, accessoryId, "tile");
  const c = tile._deckCard;
  if (c && typeof c === "object") writeEntityAccessory(c, accessoryId, "tile");
  applyIntrinsicGainsToTileAndLinkedCard(tile, gains);
  syncTileStateToDeckCard(tile);
  ctx?.onAccessoryAcquired?.(String(accessoryId));
}

/** @param {Record<string, unknown>} tile @param {string} treasureAccessoryId @param {SpellRuntimeContext} [ctx] */
function applyTileTreasureAccessory(tile, treasureAccessoryId, ctx) {
  const gains = snapshotMaxIntrinsicGainsFromTile(tile);
  writeEntityAccessory(tile, treasureAccessoryId, "tile");
  const c = tile._deckCard;
  if (c && typeof c === "object") writeEntityAccessory(c, treasureAccessoryId, "tile");
  applyIntrinsicGainsToTileAndLinkedCard(tile, gains);
  syncTileStateToDeckCard(tile);
  ctx?.onAccessoryAcquired?.(String(treasureAccessoryId));
}

/**
 * @param {Record<string, unknown>} tile
 * @param {string} rarity
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 */
function setTileRarityOnCard(tile, rarity, rarityLevelsByRarity) {
  if (tile.isWildcard) return;
  const gains = snapshotMaxIntrinsicGainsFromTile(tile);
  tile.rarity = rarity;
  tile.baseScore = getBaseScoreForRarity(rarity, rarityLevelsByRarity);
  const c = tile._deckCard;
  if (c && typeof c === "object" && c.isWildcard !== true) {
    c.rarity = rarity;
  }
  applyIntrinsicGainsToTileAndLinkedCard(tile, gains);
  syncTileStateToDeckCard(tile);
}

/**
 * @param {{ deckCardUid?: number | null }[]} ordered
 * @param {(p: { row?: number, col?: number, deckCardUid?: number | null }) => unknown} tileAt
 */
function orderedWithoutAccessoryTiles(ordered, tileAt) {
  return ordered.filter((p) => {
    const t = tileAt(p);
    if (!t || typeof t !== "object" || !/** @type {{ letter?: unknown }} */ (t).letter) return false;
    const acc = String(/** @type {{ accessoryId?: unknown }} */ (t).accessoryId ?? "").trim();
    const tAcc = String(/** @type {{ treasureAccessoryId?: unknown }} */ (t).treasureAccessoryId ?? "").trim();
    return !acc && !tAcc;
  });
}

/**
 * @param {{ deckCardUid?: number | null }[]} ordered
 * @param {() => number} rng
 */
function pickRandomOrderedDeckUid(ordered, rng) {
  const uids = ordered
    .map((p) => p?.deckCardUid)
    .filter((uid) => uid != null);
  if (!uids.length) return null;
  return uids[Math.floor(rngU(rng) * uids.length)] ?? null;
}

const WILDCARD_MATERIAL_ID = "wildcard";

/**
 * 由牌张得到棋盘格展示字段（与 `createTileFromDeckCard` 一致，用于复制后刷新格面）。
 * @param {Record<string, unknown>} card
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 */
function buildTileSurfaceFromDeckCard(card, rarityLevelsByRarity) {
  const raw = deckCardRaw(card);
  const useWildcard = card.isWildcard === true;
  const rarity = useWildcard
    ? "common"
    : card.rarity != null && String(card.rarity).trim() !== ""
      ? String(card.rarity)
      : getRarityForLetter(raw || "a");
  const letter = useWildcard ? "?" : raw === "q" ? "Qu" : String(raw || "e").toUpperCase();
  const normalizedAccessory = normalizeExclusiveTileAccessoryPair(card.accessoryId, card.treasureAccessoryId);
  return {
    letter,
    baseScore: getBaseScoreForRarity(rarity, rarityLevelsByRarity ?? null),
    rarity,
    letterMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
    tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
    materialScoreBonus: Math.max(0, Math.floor(Number(card.materialScoreBonus) || 0)),
    materialId: useWildcard ? WILDCARD_MATERIAL_ID : card.materialId != null ? String(card.materialId) : null,
    materialMultBonus: Number(card.materialMultBonus) || 0,
    accessoryId: normalizedAccessory.accessoryId,
    treasureAccessoryId: normalizedAccessory.treasureAccessoryId,
    isWildcard: useWildcard,
  };
}

/**
 * 将第 2 枚的**持久化状态**（牌张 multiset）复制到第 1 枚，保留目的格 `id` 与 `_deckCard` 引用。
 * 以 `_deckCard` 为权威，避免格上展示与牌张角标/材质不同步时只复制到字母。
 *
 * @param {Record<string, unknown>} dst
 * @param {Record<string, unknown>} src
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 */
function copyTileOntoPreserveId(dst, src, rarityLevelsByRarity) {
  const id = dst.id;
  const selected = dst.selected;
  const srcCard = src?._deckCard;
  const dstCard = dst?._deckCard;

  if (dstCard && typeof dstCard === "object" && srcCard && typeof srcCard === "object") {
    const uid = dstCard._dcUid;
    dstCard.raw = srcCard.raw;
    dstCard.rarity = String(srcCard.rarity || "common");
    dstCard.materialId = srcCard.materialId != null ? String(srcCard.materialId) : null;
    dstCard.materialScoreBonus = Math.max(0, Math.floor(Number(srcCard.materialScoreBonus) || 0));
    dstCard.materialMultBonus = Number(srcCard.materialMultBonus) || 0;
    dstCard.tileScoreBonus = Math.max(0, Math.floor(Number(srcCard.tileScoreBonus) || 0));
    dstCard.letterMultBonus = Math.max(0, Math.round(Number(srcCard.letterMultBonus) || 0));
    dstCard.isWildcard = srcCard.isWildcard === true;
    dstCard.accessoryId = srcCard.accessoryId != null ? String(srcCard.accessoryId) : null;
    dstCard.treasureAccessoryId =
      srcCard.treasureAccessoryId != null ? String(srcCard.treasureAccessoryId) : null;
    if (dstCard.isWildcard === true) dstCard.materialId = WILDCARD_MATERIAL_ID;
    dstCard._dcUid = uid;
    Object.assign(dst, buildTileSurfaceFromDeckCard(dstCard, rarityLevelsByRarity));
    dst.id = id;
    if (selected !== undefined) dst.selected = selected;
    syncTileStateToDeckCard(dst);
    return;
  }

  const patch =
    srcCard && typeof srcCard === "object"
      ? buildTileSurfaceFromDeckCard(srcCard, rarityLevelsByRarity)
      : {
          ...(normalizeExclusiveTileAccessoryPair(src.accessoryId, src.treasureAccessoryId)),
          letter: src.letter,
          baseScore: getBaseScoreForRarity(String(src.rarity || "common"), rarityLevelsByRarity ?? null),
          rarity: String(src.rarity || "common"),
          letterMultBonus: Math.max(0, Math.round(Number(src.letterMultBonus) || 0)),
          tileScoreBonus: Math.max(0, Math.floor(Number(src.tileScoreBonus) || 0)),
          materialScoreBonus: Math.max(0, Math.floor(Number(src.materialScoreBonus) || 0)),
          materialId: src.materialId != null ? String(src.materialId) : null,
          materialMultBonus: Number(src.materialMultBonus) || 0,
          isWildcard: !!src.isWildcard,
        };
  Object.assign(dst, patch);
  dst.id = id;
  if (selected !== undefined) dst.selected = selected;
  syncTileStateToDeckCard(dst);
}

/**
 * @param {Record<string, unknown>} card
 */
function deckCardToSpellTargetProxy(card) {
  const raw = deckCardRaw(card);
  const isWc = card.isWildcard === true;
  const letter = isWc ? "?" : raw === "q" ? "Qu" : String(raw || "e").toUpperCase();
  return {
    letter,
    rarity: String(card.rarity || "common"),
    tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
    letterMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
    materialScoreBonus: Math.max(0, Math.floor(Number(card.materialScoreBonus) || 0)),
    materialMultBonus: Number(card.materialMultBonus) || 0,
    materialId: isWc ? "wildcard" : card.materialId ?? null,
    accessoryId: card.accessoryId ?? null,
    isWildcard: isWc,
    _deckCard: card,
    _spellDeckOnlyProxy: true,
  };
}

/**
 * @param {SpellRuntimeContext} ctx
 * @param {{ row?: number, col?: number, deckCardUid?: number | null }} p
 * @returns {Record<string, unknown> | null}
 */
function resolveSpellTargetTile(ctx, p) {
  const g = ctx.grid.value;
  const { ROWS, COLS } = ctx;
  const uid = p?.deckCardUid;
  if (uid != null) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const t = g[r]?.[c];
        if (t?._deckCard?._dcUid === uid) return /** @type {Record<string, unknown>} */ (t);
      }
    }
    const snap = ctx.initialDeckSnapshot?.value;
    if (Array.isArray(snap)) {
      const card0 = snap.find(
        (c) =>
          c &&
          typeof c === "object" &&
          /** @type {{ _dcUid?: number }} */ (c)._dcUid === uid,
      );
      if (card0) return deckCardToSpellTargetProxy(/** @type {Record<string, unknown>} */ (card0));
    }
    const deckArr = ctx.deck?.value;
    if (Array.isArray(deckArr)) {
      const card = deckArr.find(
        (c) =>
          c &&
          typeof c === "object" &&
          /** @type {{ _dcUid?: number }} */ (c)._dcUid === uid,
      );
      if (card) return deckCardToSpellTargetProxy(/** @type {Record<string, unknown>} */ (card));
    }
    return null;
  }
  const row = Number(p?.row);
  const col = Number(p?.col);
  if (!Number.isFinite(row) || !Number.isFinite(col)) return null;
  const t = g[Math.trunc(row)]?.[Math.trunc(col)];
  return t?.letter ? /** @type {Record<string, unknown>} */ (t) : null;
}

/**
 * @typedef {{
 *   grid: import("vue").ShallowRef<Record<string, unknown>[][]>,
 *   deck?: import("vue").Ref<unknown[]>,
 *   initialDeckSnapshot?: import("vue").Ref<unknown[]>,
 *   ROWS: number,
 *   COLS: number,
 *   rarityLevelsByRarity: import("vue").Ref<Record<string, number>>,
 *   lengthLevelsByLength: import("vue").Ref<Record<number, number>>,
 *   setRarityLevel: (rarity: string, level: number) => void,
 *   setWordLengthLevel: (len: number, level: number) => void,
 *   bumpWordLengthLevel?: (len: number) => void,
 *   markTileAsWildcard: (tile: Record<string, unknown>) => void,
 *   touchGrid: () => void,
 *   removeDeckLetterInstancesByRaws: (raws: string[]) => void,
 *   removeDeckCardByUid: (uid: number) => boolean,
 *   appendShopDeckEntries: (entries: { raw: string, materialId?: string | null, accessoryId?: string | null, treasureAccessoryId?: string | null }[]) => object[],
 *   remapTileFromRawLetter: (row: number, col: number, raw: string, keepTileId?: boolean) => void,
 *   money: import("vue").Ref<number>,
 *   ownedTreasures: import("vue").Ref<(unknown | null)[]>,
 *   upgradeLengthGroups: readonly { key: string, minLen: number, maxLen: number }[],
 *   grantRandomShopTreasure: () => boolean,
 *   grantRandomShopTreasureByRarity?: (rarity: string) => { ok: boolean, slotIndex: number },
 *   setRunWordLengthJudgmentPenalty?: (n: number) => void,
 *   refreshGridTileBaseScoresFromLevels?: () => void,
 *   showToast: (msg: string) => void,
 *   setLastReplayableSpellId?: (id: string) => void,
 *   refreshBossTileDebuffOnTile?: (tile: Record<string, unknown>) => void,
 *   onMaterialAcquired?: (materialId: string) => void,
 *   onAccessoryAcquired?: (accessoryId: string) => void,
 *   grantSpellBonusShopVoucher?: () => { ok: boolean },
 * }} SpellRuntimeContext
 */

/**
 * 星星法术：1/4 概率为随机已拥有宝藏装备随机配饰；否则未命中。
 * @param {SpellRuntimeContext} ctx
 * @param {() => number} [rng]
 * @returns {{ ok: true, slotIndex: number, accessoryId: string } | { ok: false }}
 */
export function resolveStarSpellOutcome(ctx, rng = Math.random) {
  if (rngU(rng) >= 0.25) return { ok: false };
  const slots = ctx.ownedTreasures.value;
  /** @type {number[]} */
  const ixList = [];
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] != null) ixList.push(i);
  }
  if (ixList.length === 0) return { ok: false };
  const ix = ixList[Math.floor(rngU(rng) * ixList.length)];
  const acc = ALL_TREASURE_ACCESSORY_IDS[Math.floor(rngU(rng) * ALL_TREASURE_ACCESSORY_IDS.length)];
  return { ok: true, slotIndex: ix, accessoryId: acc };
}

/**
 * @param {SpellRuntimeContext} ctx
 * @param {{ ok: true, slotIndex: number, accessoryId: string }} outcome
 */
export function applyStarSpellOutcome(ctx, outcome) {
  if (!outcome?.ok) return;
  const slots = ctx.ownedTreasures.value;
  const ix = outcome.slotIndex;
  const cur = slots[ix];
  if (cur && typeof cur === "object") {
    const nextSlots = [...slots];
    nextSlots[ix] = { ...cur, treasureAccessoryId: outcome.accessoryId };
    ctx.ownedTreasures.value = nextSlots;
    ctx.onAccessoryAcquired?.(outcome.accessoryId);
  }
}

/**
 * @param {SpellRuntimeContext} ctx
 * @param {string} purchasedSpellId 玩家购买的法术 id（用于更新「重播」锚点）
 * @param {string} effectiveSpellId 实际执行的逻辑 id（重播时为上一张）
 * @param {{ row?: number, col?: number, deckCardUid?: number | null }[]} ordered
 * @param {{ nested?: boolean, rng?: () => number }} opts
 */
export function applySpell(ctx, purchasedSpellId, effectiveSpellId, ordered, opts = {}) {
  const nested = opts.nested === true;
  const rng = typeof opts.rng === "function" ? opts.rng : Math.random;
  const g = ctx.grid.value;
  const { ROWS, COLS } = ctx;

  const sid = String(effectiveSpellId ?? "");
  const gridOrdered = ordered
    .map((p) => {
      const row = Number(p?.row);
      const col = Number(p?.col);
      if (Number.isFinite(row) && Number.isFinite(col)) return { row: Math.trunc(row), col: Math.trunc(col) };
      const uid = p?.deckCardUid;
      if (uid == null) return null;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (g[r]?.[c]?._deckCard?._dcUid === uid) return { row: r, col: c };
        }
      }
      return null;
    })
    .filter(Boolean);
  let tileAppearanceTargets = getSpellTileAppearanceTargets(sid, gridOrdered, g, ROWS, COLS);

  /** @type {Record<string, unknown> | null} */
  let spellFx = null;

  const tileAt = (p) => resolveSpellTargetTile(ctx, p);

  const after = () => {
    if (typeof ctx.refreshBossTileDebuffOnTile === "function") {
      for (const p of tileAppearanceTargets) {
        const t = g[p.row]?.[p.col];
        if (t?.letter) ctx.refreshBossTileDebuffOnTile(t);
      }
    }
    ctx.touchGrid();
    if (!nested && String(purchasedSpellId ?? "") !== "restart") {
      ctx.setLastReplayableSpellId?.(String(purchasedSpellId ?? ""));
    }
  };

  switch (sid) {
    case "cake": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "lucky", ctx);
      }
      break;
    }
    case "blaze": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "fire", ctx);
      }
      break;
    }
    case "drinks": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "water", ctx);
      }
      break;
    }
    case "lightbulb": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        ctx.markTileAsWildcard(t);
      }
      break;
    }
    case "hammer": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "steel", ctx);
      }
      break;
    }
    case "snowflake": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "ice", ctx);
      }
      break;
    }
    case "flask": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "gold", ctx);
      }
      break;
    }
    case "bard": {
      const rl = ctx.rarityLevelsByRarity.value;
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        bumpTileRarityOne(t, rl);
      }
      break;
    }
    case "mic": {
      const pool = allConsonantRaws();
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        const raw = pickRandomRaw(pool, rng);
        ctx.remapTileFromRawLetter(p.row, p.col, raw, true);
      }
      break;
    }
    case "notification": {
      const pool = allVowelRaws();
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        const raw = pickRandomRaw(pool, rng);
        ctx.remapTileFromRawLetter(p.row, p.col, raw, true);
      }
      break;
    }
    case "phone": {
      const pool = allLetterRaws();
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        const raw = pickRandomRaw(pool, rng);
        ctx.remapTileFromRawLetter(p.row, p.col, raw, true);
      }
      break;
    }
    case "seedling": {
      const sorted = [...ordered].sort((a, b) => b.row - a.row);
      for (const p of sorted) {
        if (p.row >= ROWS - 1) continue;
        const a = g[p.row][p.col];
        const b = g[p.row + 1][p.col];
        g[p.row][p.col] = b;
        g[p.row + 1][p.col] = a;
      }
      break;
    }
    case "delete_back": {
      const raws = [];
      for (const p of ordered) {
        const raw = tileLetterToRaw(tileAt(p));
        if (raw) raws.push(raw);
      }
      ctx.removeDeckLetterInstancesByRaws(raws);
      break;
    }
    case "file_copy": {
      if (ordered.length >= 2) {
        const dst = tileAt(ordered[0]);
        const src = tileAt(ordered[1]);
        if (dst?.letter && src?.letter) copyTileOntoPreserveId(dst, src, ctx.rarityLevelsByRarity.value);
      }
      break;
    }
    case "hand_coin": {
      const m = ctx.money.value;
      const next = Math.min(m * 2, m + 20);
      ctx.money.value = next;
      break;
    }
    case "star": {
      const outcome = resolveStarSpellOutcome(ctx, rng);
      if (outcome.ok) {
        applyStarSpellOutcome(ctx, outcome);
        spellFx = {
          kind: "star_accessory",
          slotIndex: outcome.slotIndex,
          accessoryId: outcome.accessoryId,
        };
      } else {
        spellFx = { kind: "star_miss" };
      }
      break;
    }
    case "price_tag": {
      let sum = 0;
      for (const t of ctx.ownedTreasures.value) {
        if (t && typeof t === "object") {
          sum += computeOwnedTreasureSellRefund(t);
        }
      }
      ctx.money.value += sum;
      break;
    }
    case "arrow_up": {
      const picks = rollRandomUpgradePicks(ctx.upgradeLengthGroups, 2, rng);
      for (const p of picks) applyRandomUpgradePick(p, ctx);
      break;
    }
    case "familiar": {
      const remUid =
        ctx.forcedRemoveDeckCardUid != null
          ? ctx.forcedRemoveDeckCardUid
          : pickRandomOrderedDeckUid(ordered, rng);
      if (remUid != null) ctx.removeDeckCardByUid?.(remUid);
      const vowels = [];
      for (let i = 0; i < 3; i++) vowels.push(pickRandomRaw(allVowelRaws(), rng));
      const entries = buildEnhancedDeckEntries(vowels, rng);
      const addedDeckCards = ctx.appendShopDeckEntries?.(entries) ?? [];
      spellFx = {
        kind: "deck_add",
        count: entries.length,
        removedDeckCardUid: remUid,
        source: "spell_icon",
        addedDeckCards,
      };
      break;
    }
    case "grim": {
      const remUid =
        ctx.forcedRemoveDeckCardUid != null
          ? ctx.forcedRemoveDeckCardUid
          : pickRandomOrderedDeckUid(ordered, rng);
      if (remUid != null) ctx.removeDeckCardByUid?.(remUid);
      const entries = buildEnhancedDeckEntries(["e", "e"], rng);
      const addedDeckCards = ctx.appendShopDeckEntries?.(entries) ?? [];
      spellFx = {
        kind: "deck_add",
        count: entries.length,
        removedDeckCardUid: remUid,
        source: "spell_icon",
        addedDeckCards,
      };
      break;
    }
    case "incantation": {
      const remUid =
        ctx.forcedRemoveDeckCardUid != null
          ? ctx.forcedRemoveDeckCardUid
          : pickRandomOrderedDeckUid(ordered, rng);
      if (remUid != null) ctx.removeDeckCardByUid?.(remUid);
      const raws = [];
      for (let i = 0; i < 4; i++) raws.push(pickRandomRaw(allConsonantRaws(), rng));
      const entries = buildEnhancedDeckEntries(raws, rng);
      const addedDeckCards = ctx.appendShopDeckEntries?.(entries) ?? [];
      spellFx = {
        kind: "deck_add",
        count: entries.length,
        removedDeckCardUid: remUid,
        source: "spell_icon",
        addedDeckCards,
      };
      break;
    }
    case "talisman": {
      const pool = orderedWithoutAccessoryTiles(ordered, tileAt);
      const pick = pool.length ? [pool[Math.floor(rngU(rng) * pool.length)]] : [];
      for (const p of pick) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyTileBoardAccessory(t, TILE_ACCESSORY_COIN, ctx);
      }
      break;
    }
    case "aura": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        const acc = TILE_AURA_ACCESSORY_POOL[Math.floor(rngU(rng) * TILE_AURA_ACCESSORY_POOL.length)];
        if (acc.startsWith("treasure_acc_")) applyTileTreasureAccessory(t, acc, ctx);
        else applyTileBoardAccessory(t, acc, ctx);
      }
      break;
    }
    case "deja_vu": {
      const pool = orderedWithoutAccessoryTiles(ordered, tileAt);
      const pick = pool.length ? [pool[Math.floor(rngU(rng) * pool.length)]] : [];
      for (const p of pick) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyTileBoardAccessory(t, TILE_ACCESSORY_REWIND, ctx);
      }
      break;
    }
    case "wrench": {
      const pool = orderedWithoutAccessoryTiles(ordered, tileAt);
      const pick = pool.length ? [pool[Math.floor(rngU(rng) * pool.length)]] : [];
      for (const p of pick) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyTileTreasureAccessory(t, TREASURE_ACCESSORY_WRENCH, ctx);
      }
      break;
    }
    case "diamond": {
      const pool = orderedWithoutAccessoryTiles(ordered, tileAt);
      const pick = pool.length ? [pool[Math.floor(rngU(rng) * pool.length)]] : [];
      for (const p of pick) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyTileBoardAccessory(t, TILE_ACCESSORY_VIP_DIAMOND, ctx);
      }
      break;
    }
    case "cache": {
      const slotsLenBefore = ctx.ownedTreasures.value.length;
      const r = ctx.grantRandomShopTreasureByRarity?.("epic");
      if (!r?.ok) ctx.showToast?.("没有空宝藏槽或无可售史诗宝藏");
      else {
        spellFx = {
          kind: "treasure_grant",
          slotIndex: r.slotIndex,
          slotsExpanded: ctx.ownedTreasures.value.length > slotsLenBefore,
        };
      }
      break;
    }
    case "wraith": {
      ctx.money.value = 0;
      const slotsLenBefore = ctx.ownedTreasures.value.length;
      const r = ctx.grantRandomShopTreasureByRarity?.("legendary");
      if (!r?.ok) ctx.showToast?.("没有空宝藏槽或无可售传说宝藏");
      else {
        spellFx = {
          kind: "treasure_grant",
          slotIndex: r.slotIndex,
          slotsExpanded: ctx.ownedTreasures.value.length > slotsLenBefore,
        };
      }
      break;
    }
    case "ouija": {
      const rl = ctx.rarityLevelsByRarity.value;
      const targetRarity = LETTER_RARITY_ORDER[Math.floor(rngU(rng) * LETTER_RARITY_ORDER.length)] ?? "common";
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        setTileRarityOnCard(t, targetRarity, rl);
      }
      break;
    }
    case "ectoplasm": {
      const slots = ctx.ownedTreasures.value;
      const ixList = [];
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] != null) ixList.push(i);
      }
      if (ixList.length === 0) break;
      const ix = ixList[Math.floor(rngU(rng) * ixList.length)];
      const cur = slots[ix];
      if (cur && typeof cur === "object") {
        const nextSlots = [...slots];
        nextSlots[ix] = { ...cur, treasureAccessoryId: TREASURE_ACCESSORY_CROP };
        ctx.ownedTreasures.value = nextSlots;
        spellFx = { kind: "treasure_accessory", slotIndex: ix };
      }
      ctx.setRunWordLengthJudgmentPenalty?.(1);
      break;
    }
    case "immolate": {
      const uids = ordered.map((p) => p?.deckCardUid).filter((uid) => uid != null);
      for (const uid of uids) {
        if (uid != null) ctx.removeDeckCardByUid?.(uid);
      }
      ctx.money.value += 15;
      spellFx = { kind: "immolate", removedCount: uids.length };
      break;
    }
    case "ankh": {
      const slots = [...ctx.ownedTreasures.value];
      const owned = slots.map((t, i) => ({ t, i })).filter((x) => x.t != null);
      if (!owned.length) break;
      const pick = owned[Math.floor(rngU(rng) * owned.length)];
      const proto = /** @type {Record<string, unknown>} */ (pick.t);
      const kept = serializeOwnedTreasureSlot(proto);
      const newSlots = slots.map((t, i) => {
        if (t == null) return null;
        if (i === pick.i) return buildOwnedTreasureSlot(kept);
        if (ownedTreasureHasNoSellAccessory(t)) return t;
        return null;
      });
      let copyIx = -1;
      for (let j = 0; j < newSlots.length; j++) {
        if (j !== pick.i && newSlots[j] == null) {
          copyIx = j;
          break;
        }
      }
      if (copyIx >= 0) newSlots[copyIx] = buildOwnedTreasureSlot(kept);
      ctx.ownedTreasures.value = newSlots;
      spellFx = { kind: "ankh", keptSlotIndex: pick.i, copySlotIndex: copyIx };
      break;
    }
    case "dice": {
      if (opts.skipDiceInline !== true) {
        const pool = SPELL_DEFINITIONS.map((d) => d.id).filter(
          (id) =>
            !SPELL_IDS_EXCLUDED_FROM_DICE.includes(id) &&
            !spellHasTag(getSpellDefinition(id), SPELL_TAG_SPECTRAL),
        );
        const merged = [];
        for (let k = 0; k < 2; k++) {
          const sub = pool[Math.floor(rngU(rng) * pool.length)];
          const def = getSpellDefinition(sub);
          const n = def ? Math.max(0, def.pickCount) : 0;
          const sel = n > 0 ? buildRandomSpellSelection(g, ROWS, COLS, n, rng) : [];
          const r = applySpell(ctx, sub, sub, sel, { nested: true, rng });
          merged.push(...(r?.tileAppearanceTargets ?? []));
        }
        tileAppearanceTargets = dedupeAppearancePositions(merged);
      }
      break;
    }
    case "treasure_map": {
      const slotsLenBefore = ctx.ownedTreasures.value.length;
      const r = ctx.grantRandomShopTreasureByRarity?.(null);
      if (!r?.ok) ctx.showToast?.("没有空宝藏槽或无可售宝藏");
      else {
        spellFx = {
          kind: "treasure_grant",
          slotIndex: r.slotIndex,
          slotsExpanded: ctx.ownedTreasures.value.length > slotsLenBefore,
        };
      }
      break;
    }
    case "coupon_drop": {
      const r = ctx.grantSpellBonusShopVoucher?.();
      spellFx = { kind: "voucher_bonus", granted: r?.ok === true };
      break;
    }
    default:
      break;
  }

  after();
  return { tileAppearanceTargets, spellFx };
}
