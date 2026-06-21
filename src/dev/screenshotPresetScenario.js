import {
  ACCESSORY_CATALOG,
  ACCESSORY_CROP,
  ACCESSORY_FIRE,
  ACCESSORY_NO_SELL,
  ACCESSORY_WRENCH,
} from "../accessories/accessoryCatalog.js";
import { getAccessoryIdsForRollPool } from "../accessories/accessoryResolve.js";
import {
  assignCellsToWord,
  pickedLetterMultiset,
  wordMatchesMultiset,
} from "../e2e/gridWordFinder.js";
import { allLetterRaws } from "../game/initialDeckLetterCounts.js";
import { syncTileStateToDeckCard } from "../game/deckCardSync.js";
import { getRarityForLetter } from "../composables/useScoring.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import { buildDeckTileOfferDisplay } from "../shop/rollDeckTileModifiers.js";
import { SHOP_TILE_PACK_MATERIAL_IDS } from "../shop/shopPackEconomy.js";
import { IMPLEMENTED_TREASURE_ID_SET } from "../treasures/treasureCatalog.js";
import { rollDistinctShopTreasures } from "../treasures/shopTreasureRoll.js";
import { applyDevGridMaterial } from "./randomizeGridTileMaterials.js";

export const PROMO_GAMEPLAY_MATERIAL_PLAN = Object.freeze([
  "wildcard",
  "wildcard",
  "wildcard",
  "fire",
  "fire",
  "water",
  "water",
  "lucky",
  "steel",
  "steel",
]);

export const PROMO_GAMEPLAY_TREASURE_ACCESSORY_PLAN = Object.freeze([
  [ACCESSORY_CROP],
  [ACCESSORY_FIRE],
  [ACCESSORY_WRENCH],
  [ACCESSORY_WRENCH],
  [ACCESSORY_NO_SELL],
  [],
]);

const PROMO_TILE_ACCESSORY_IDS = Object.freeze([
  ...getAccessoryIdsForRollPool("deckTileBoard"),
  ...getAccessoryIdsForRollPool("deckTileEdition"),
]);

const PROMO_SUPER_PACK_MATERIAL_IDS = SHOP_TILE_PACK_MATERIAL_IDS.filter((id) => id !== "wildcard");

/** @type {Readonly<Record<string, number>>} */
const SCREENSHOT_PRESET_ALIASES = Object.freeze({
  1: 1,
  gameplay: 1,
  2: 2,
  collection: 2,
  3: 3,
  superpack: 3,
  superPack: 3,
  "super-pack": 3,
});

/**
 * @param {unknown} preset
 * @returns {1 | 2 | 3 | null}
 */
export function normalizeScreenshotPresetId(preset) {
  const key = typeof preset === "number" ? preset : String(preset ?? "").trim();
  const id = SCREENSHOT_PRESET_ALIASES[key];
  return id === 1 || id === 2 || id === 3 ? id : null;
}

/**
 * @param {readonly unknown[]} pool
 * @param {number} count
 * @param {() => number} rng
 */
function shufflePick(pool, count, rng) {
  const items = [...pool];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, Math.min(count, items.length));
}

/**
 * @param {number} min
 * @param {number} max
 * @param {number} step
 * @param {number} count
 * @param {() => number} rng
 */
function pickDistinctNumericValues(min, max, step, count, rng) {
  /** @type {number[]} */
  const pool = [];
  for (let v = min; v <= max; v += step) pool.push(v);
  return shufflePick(pool, count, rng);
}

/**
 * @param {object[][] | null | undefined} grid
 * @param {number} rows
 * @param {number} cols
 * @param {() => number} [rng]
 */
export function applyPromoGameplayGridMaterials(
  grid,
  rows,
  cols,
  rng = Math.random,
  materialPlan = PROMO_GAMEPLAY_MATERIAL_PLAN,
) {
  if (!grid) return { updated: 0, tiles: [] };
  /** @type {{ row: number, col: number, materialId: string }[]} */
  const candidates = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tile = grid[row]?.[col];
      if (!tile?.letter || tile.bossGridBlocked) continue;
      candidates.push({ row, col });
    }
  }
  const picked = shufflePick(candidates, materialPlan.length, rng);
  /** @type {{ row: number, col: number, materialId: string }[]} */
  const tiles = [];
  for (let i = 0; i < picked.length; i += 1) {
    const { row, col } = picked[i];
    const materialId = materialPlan[i] ?? materialPlan[materialPlan.length - 1];
    const tile = grid[row][col];
    applyDevGridMaterial(tile, materialId);
    tiles.push({ row, col, materialId });
  }
  return { updated: tiles.length, tiles };
}

/**
 * @param {object[][] | null | undefined} grid
 * @param {number} rows
 * @param {number} cols
 * @param {() => number} [rng]
 */
export function applyPromoGameplayTileBonuses(grid, rows, cols, rng = Math.random) {
  if (!grid) return { multTiles: 0, scoreTiles: 0 };
  /** @type {Record<string, unknown>[]} */
  const tiles = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const tile = grid[row]?.[col];
      if (!tile?.letter || tile.bossGridBlocked) continue;
      tiles.push(tile);
    }
  }
  const multValues = pickDistinctNumericValues(1, 20, 1, tiles.length, rng);
  const scoreValues = pickDistinctNumericValues(4, 108, 4, tiles.length, rng);
  let multTiles = 0;
  let scoreTiles = 0;
  let multIdx = 0;
  let scoreIdx = 0;
  for (const tile of tiles) {
    if (rng() < 0.5) {
      tile.letterMultBonus = multValues[multIdx % multValues.length] ?? 1;
      multIdx += 1;
      multTiles += 1;
    }
    if (rng() < 0.5) {
      tile.tileScoreBonus = scoreValues[scoreIdx % scoreValues.length] ?? 4;
      scoreIdx += 1;
      scoreTiles += 1;
    }
    syncTileStateToDeckCard(tile);
  }
  return { multTiles, scoreTiles };
}

/**
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 * @param {readonly import('../treasures/treasureTypes.js').TreasureDef[]} treasurePool
 * @param {() => number} [rng]
 */
export function applyPromoGameplayOwnedTreasures(
  ownedTreasuresRef,
  buildOwnedTreasureSlot,
  treasurePool,
  rng = Math.random,
) {
  const pool = treasurePool.filter((t) => IMPLEMENTED_TREASURE_ID_SET.has(t.treasureId));
  const count = PROMO_GAMEPLAY_TREASURE_ACCESSORY_PLAN.length;
  const picks = rollDistinctShopTreasures(pool, new Set(), new Set(), count, rng);
  /** @type {(object | null)[]} */
  const slots = picks.map((def, i) => {
    const accessoryIds = PROMO_GAMEPLAY_TREASURE_ACCESSORY_PLAN[i] ?? [];
    return buildOwnedTreasureSlot({
      treasureId: def.treasureId,
      price: def.price,
      ...(accessoryIds.length ? { treasureAccessoryIds: [...accessoryIds] } : {}),
    });
  });
  ownedTreasuresRef.value = slots;
  return {
    treasureIds: picks.map((def) => def.treasureId),
    slotCount: slots.length,
  };
}

/**
 * @param {string} accessoryId
 */
function accessoryFieldsForDeckTileOffer(accessoryId) {
  const legacy = ACCESSORY_CATALOG[accessoryId]?.legacyStorage;
  if (legacy === "board") return { accessoryId, treasureAccessoryId: null };
  return { accessoryId: null, treasureAccessoryId: accessoryId };
}

/**
 * @param {() => number} nextOfferInstanceId
 * @param {() => number} [rng]
 */
export function buildPromoSuperPackPickSession(nextOfferInstanceId, rng = Math.random) {
  const letterPool = allLetterRaws();
  const letters = shufflePick(letterPool, 4, rng);
  const materialPlan = [
    "wildcard",
    ...shufflePick(PROMO_SUPER_PACK_MATERIAL_IDS, 3, rng),
  ];
  const accessorySlots = shufflePick([0, 1, 2, 3], 3, rng);
  const accessorySlotSet = new Set(accessorySlots);
  const accessoryIds = shufflePick(PROMO_TILE_ACCESSORY_IDS, 3, rng);

  /** @type {object[]} */
  const options = [];
  let accessoryIdx = 0;
  for (let i = 0; i < 5; i += 1) {
    const raw = letters[i] ?? "a";
    const materialId = materialPlan[i] ?? "fire";
    const hasAccessory = accessorySlotSet.has(i);
    const accessoryId = hasAccessory ? accessoryIds[accessoryIdx++] ?? null : null;
    const accessoryFields = accessoryId ? accessoryFieldsForDeckTileOffer(accessoryId) : {};
    const letterDisp = resolveLetterFromRaw(raw);
    const rarity = getRarityForLetter(letterDisp);
    const copy = buildDeckTileOfferDisplay(letterDisp, {
      materialId,
      ...accessoryFields,
    });
    const offerInstanceId = nextOfferInstanceId();
    options.push({
      kind: "offer",
      offerType: "deckTile",
      optionKey: `promo-tile-${raw}-${materialId}-${i}`,
      offerInstanceId,
      treasureId: `deck_tile_${raw}_${materialId}_${i}`,
      price: 0,
      rarity,
      letterRarity: rarity,
      name: copy.name,
      emoji: "",
      description: copy.description,
      deckLetterRaw: raw,
      deckTileMaterialId: materialId,
      deckTileAccessoryId: accessoryFields.accessoryId ?? null,
      deckTileTreasureAccessoryId: accessoryFields.treasureAccessoryId ?? null,
    });
  }

  const bundleRow = {
    kind: "offer",
    offerType: "bundlePack",
    bundleKind: "tile",
    bundleSize: "mega",
    pickCount: 2,
    poolSize: 4,
    name: "超级字母包",
    bundleOptions: options,
  };

  return {
    bundleRow,
    bundleKind: "tile",
    title: "超级字母包",
    pickCount: 2,
    options,
    claimedKeys: /** @type {string[]} */ ([]),
    grantContext: "inRun",
  };
}

const MIN_WORD_LEN = 3;
const MAX_WORD_LEN = 12;
/** 万能块较多时全量扫词典会长时间阻塞主线程 */
const LONGEST_WORD_MAX_CHECKS_PER_LENGTH = 12000;

/**
 * @param {import('../e2e/gridWordFinder.js').GridCell[]} cells
 * @param {(len: number) => readonly string[]} getCandidatesByLength
 * @param {(pattern: string, wildcardChar?: string) => string | null} resolveWordPattern
 * @param {{ maxChecksPerLength?: number, yieldBetweenLengths?: boolean }} [opts]
 */
export async function findLongestValidWordsOnGrid(
  cells,
  getCandidatesByLength,
  resolveWordPattern,
  opts = {},
) {
  const maxChecks = Math.max(500, Math.floor(Number(opts.maxChecksPerLength) || LONGEST_WORD_MAX_CHECKS_PER_LENGTH));
  const yieldBetween = opts.yieldBetweenLengths !== false;
  const available = cells.filter((c) => c?.letter && !c.blocked && !c.bossDebuffed);
  if (available.length < MIN_WORD_LEN) {
    return { maxLen: 0, longest: [], totalValidAtMaxLen: 0, truncated: false };
  }

  const gridMs = pickedLetterMultiset(available);
  const maxLen = Math.min(MAX_WORD_LEN, available.length);
  /** @type {import('../e2e/gridWordFinder.js').WordPick[]} */
  let longest = [];
  let truncated = false;

  for (let L = maxLen; L >= MIN_WORD_LEN; L -= 1) {
    if (yieldBetween) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const candidates = getCandidatesByLength(L);
    if (!Array.isArray(candidates) || !candidates.length) continue;

    /** @type {import('../e2e/gridWordFinder.js').WordPick[]} */
    const matches = [];
    const seen = new Set();
    let checks = 0;
    for (const word of candidates) {
      checks += 1;
      if (checks > maxChecks) {
        truncated = true;
        break;
      }
      if (!wordMatchesMultiset(word, gridMs)) continue;
      const path = assignCellsToWord(word, available);
      if (!path) continue;
      const pattern = path
        .map((c) => (c.isWildcard ? "?" : c.letter.toLowerCase()))
        .join("");
      const resolved = resolveWordPattern(pattern, "?");
      if (!resolved || resolved !== word) continue;
      const key = `${word}|${path.map((p) => `${p.row},${p.col}`).join(";")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      matches.push({ word, path, pattern });
    }
    if (matches.length > 0) {
      longest = matches;
      return { maxLen: L, longest, totalValidAtMaxLen: matches.length, truncated };
    }
  }

  return { maxLen: 0, longest, totalValidAtMaxLen: 0, truncated };
}

/**
 * @param {object[][]} grid
 * @param {number} rows
 * @param {number} cols
 * @param {(tile: Record<string, unknown>) => boolean} isWildcardTile
 * @param {(len: number) => readonly string[]} getCandidatesByLength
 * @param {(pattern: string, wildcardChar?: string) => string | null} resolveWordPattern
 */
export async function logLongestValidWordsOnGrid(
  grid,
  rows,
  cols,
  isWildcardTile,
  getCandidatesByLength,
  resolveWordPattern,
) {
  /** @type {import('../e2e/gridWordFinder.js').GridCell[]} */
  const cells = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const t = grid[r]?.[c];
      if (!t?.letter) continue;
      cells.push({
        row: r,
        col: c,
        letter: String(t.letter),
        rarity: String(t.rarity ?? "common"),
        isWildcard: isWildcardTile(t),
        blocked: !!t.bossGridBlocked,
        bossDebuffed: !!t.bossTileDebuffed,
      });
    }
  }
  const boardLetters = cells.map((c) => (c.isWildcard ? "?" : c.letter)).join(" ");
  const { maxLen, longest, totalValidAtMaxLen, truncated } = await findLongestValidWordsOnGrid(
    cells,
    getCandidatesByLength,
    (pattern) => resolveWordPattern(pattern, "?"),
  );
  console.log(`[DEV] 宣传预设 1 — 棋盘字母: ${boardLetters}`);
  if (truncated) {
    console.warn(
      `[DEV] 宣传预设 1 — 最长词扫描已达单长度 ${LONGEST_WORD_MAX_CHECKS_PER_LENGTH} 条上限（万能块较多时属正常保护），结果可能不完整`,
    );
  }
  console.log(
    `[DEV] 宣传预设 1 — 最长可拼单词 (长度 ${maxLen}, 共 ${totalValidAtMaxLen} 个):`,
    longest.slice(0, 12).map((p) => ({
      word: p.word,
      pattern: p.pattern,
      path: p.path.map((cell) => `${cell.row},${cell.col}:${cell.letter}`),
    })),
  );
  if (longest.length > 12) {
    console.log(`[DEV] 宣传预设 1 — … 另有 ${longest.length - 12} 个同长度单词未展开`);
  }
  return { maxLen, longest, totalValid: totalValidAtMaxLen, boardLetters, truncated };
}
