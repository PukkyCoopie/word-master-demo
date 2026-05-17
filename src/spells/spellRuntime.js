import { deckCardRaw, syncTileStateToDeckCard } from "../composables/useGameState.js";
import { snapshotMaxIntrinsicGainsFromTile, applyIntrinsicGainsToTileAndLinkedCard } from "../game/tileIntrinsicGains.js";
import { getBaseScoreForRarity, getRarityForLetter, LETTER_RARITY_ORDER, RARITY_BY_LETTER } from "../composables/useScoring.js";
import { SPELL_DEFINITIONS, SPELL_IDS_EXCLUDED_FROM_DICE, getSpellDefinition } from "./spellDefinitions.js";
import { ALL_TREASURE_ACCESSORY_IDS } from "../game/treasureAccessories.js";
import { applyRandomUpgradePick, rollRandomUpgradePicks } from "../shop/randomUpgradeRoll.js";

const WATER_MATERIAL_SCORE_BONUS = 30;
const FIRE_MATERIAL_MULT_BONUS = 4;
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
 */
function applyPlainMaterial(tile, materialId) {
  const gains = snapshotMaxIntrinsicGainsFromTile(tile);
  clearMaterialEconomy(tile);
  tile.materialId = materialId;
  if (materialId === "water") tile.materialScoreBonus = WATER_MATERIAL_SCORE_BONUS;
  if (materialId === "fire") tile.materialMultBonus = FIRE_MATERIAL_MULT_BONUS;
  if (materialId !== "wildcard") tile.isWildcard = false;
  applyIntrinsicGainsToTileAndLinkedCard(tile, gains);
  syncTileStateToDeckCard(tile);
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
  return {
    letter,
    baseScore: getBaseScoreForRarity(rarity, rarityLevelsByRarity ?? null),
    rarity,
    letterMultBonus: Math.max(0, Math.round(Number(card.letterMultBonus) || 0)),
    tileScoreBonus: Math.max(0, Math.floor(Number(card.tileScoreBonus) || 0)),
    materialScoreBonus: Math.max(0, Math.floor(Number(card.materialScoreBonus) || 0)),
    materialId: useWildcard ? WILDCARD_MATERIAL_ID : card.materialId != null ? String(card.materialId) : null,
    materialMultBonus: Number(card.materialMultBonus) || 0,
    accessoryId: card.accessoryId != null ? String(card.accessoryId) : null,
    treasureAccessoryId:
      card.treasureAccessoryId != null ? String(card.treasureAccessoryId) : null,
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
          letter: src.letter,
          baseScore: getBaseScoreForRarity(String(src.rarity || "common"), rarityLevelsByRarity ?? null),
          rarity: String(src.rarity || "common"),
          letterMultBonus: Math.max(0, Math.round(Number(src.letterMultBonus) || 0)),
          tileScoreBonus: Math.max(0, Math.floor(Number(src.tileScoreBonus) || 0)),
          materialScoreBonus: Math.max(0, Math.floor(Number(src.materialScoreBonus) || 0)),
          materialId: src.materialId != null ? String(src.materialId) : null,
          materialMultBonus: Number(src.materialMultBonus) || 0,
          accessoryId: src.accessoryId != null ? String(src.accessoryId) : null,
          treasureAccessoryId:
            src.treasureAccessoryId != null ? String(src.treasureAccessoryId) : null,
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
 *   remapTileFromRawLetter: (row: number, col: number, raw: string, keepTileId?: boolean) => void,
 *   money: import("vue").Ref<number>,
 *   ownedTreasures: import("vue").Ref<(unknown | null)[]>,
 *   upgradeLengthGroups: readonly { key: string, minLen: number, maxLen: number }[],
 *   grantRandomShopTreasure: () => boolean,
 *   showToast: (msg: string) => void,
 *   setLastReplayableSpellId?: (id: string) => void,
 * }} SpellRuntimeContext
 */

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

  const tileAt = (p) => resolveSpellTargetTile(ctx, p);

  const after = () => {
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
        applyPlainMaterial(t, "lucky");
      }
      break;
    }
    case "blaze": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "fire");
      }
      break;
    }
    case "drinks": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "water");
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
        applyPlainMaterial(t, "steel");
      }
      break;
    }
    case "snowflake": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "ice");
      }
      break;
    }
    case "flask": {
      for (const p of ordered) {
        const t = tileAt(p);
        if (!t?.letter) continue;
        applyPlainMaterial(t, "gold");
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
      if (rngU(rng) >= 0.25) break;
      const slots = ctx.ownedTreasures.value;
      const ixList = [];
      for (let i = 0; i < slots.length; i++) {
        if (slots[i] != null) ixList.push(i);
      }
      if (ixList.length === 0) break;
      const ix = ixList[Math.floor(rngU(rng) * ixList.length)];
      const acc = ALL_TREASURE_ACCESSORY_IDS[Math.floor(rngU(rng) * ALL_TREASURE_ACCESSORY_IDS.length)];
      const cur = slots[ix];
      if (cur && typeof cur === "object") {
        const nextSlots = [...slots];
        nextSlots[ix] = { ...cur, treasureAccessoryId: acc };
        ctx.ownedTreasures.value = nextSlots;
      }
      break;
    }
    case "price_tag": {
      let sum = 0;
      for (const t of ctx.ownedTreasures.value) {
        if (t && typeof t === "object" && t.price != null) {
          sum += Math.floor(Number(t.price) / 2);
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
    case "dice": {
      const pool = SPELL_DEFINITIONS.map((d) => d.id).filter((id) => !SPELL_IDS_EXCLUDED_FROM_DICE.includes(id));
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
      break;
    }
    case "treasure_map": {
      const ok = ctx.grantRandomShopTreasure?.() === true;
      if (!ok) ctx.showToast?.("没有空宝藏槽或无可售宝藏。");
      break;
    }
    default:
      break;
  }

  after();
  return { tileAppearanceTargets };
}
