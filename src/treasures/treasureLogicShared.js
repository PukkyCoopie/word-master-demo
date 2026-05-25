import { getMergedRarityTier, hasRarityTierMerge } from "../game/treasureRarityTierMerge.js";

/** 相邻字母块是否为同一字母（小写比较，含 qu 一格） */
export function hasConsecutiveDuplicateLetters(tiles) {
  if (!tiles || tiles.length < 2) return false;
  for (let i = 0; i < tiles.length - 1; i++) {
    const a = String(tiles[i]?.letter ?? "").toLowerCase();
    const b = String(tiles[i + 1]?.letter ?? "").toLowerCase();
    if (a.length > 0 && a === b) return true;
  }
  return false;
}

/** 是否存在某字母出现次数 >= 3 */
export function hasTripleLetterCount(tiles) {
  const m = new Map();
  for (const t of tiles ?? []) {
    const k = String(t?.letter ?? "").toLowerCase();
    if (!k) continue;
    const n = (m.get(k) || 0) + 1;
    m.set(k, n);
    if (n >= 3) return true;
  }
  return false;
}

/** 单词无重复字母（各格 letter 去重后数量等于词长） */
export function hasAllUniqueLetters(tiles) {
  const letters = (tiles ?? []).map((t) => String(t?.letter ?? "").toLowerCase()).filter(Boolean);
  return letters.length > 0 && new Set(letters).size === letters.length;
}

export function distinctRarityCount(letterParts, ownedSlotTreasureIds = null) {
  const s = new Set();
  const merge = hasRarityTierMerge(ownedSlotTreasureIds);
  for (const p of letterParts ?? []) {
    if (p?.rarity) s.add(merge ? getMergedRarityTier(p.rarity) : p.rarity);
  }
  return s.size;
}

export function allUniformRarity(letterParts, ownedSlotTreasureIds = null) {
  const parts = letterParts ?? [];
  if (parts.length === 0) return false;
  const merge = hasRarityTierMerge(ownedSlotTreasureIds);
  const r0 = parts[0].rarity;
  if (!merge) return parts.every((p) => p.rarity === r0);
  const t0 = getMergedRarityTier(r0);
  return parts.every((p) => getMergedRarityTier(p.rarity) === t0);
}

/**
 * @param {unknown[][]} grid
 * @param {number} rows
 * @param {number} cols
 * @param {Set<string> | null | undefined} excludedPositionKeys `"row,col"`；有则跳过这些格
 * @param {{ excludeBossDebuffed?: boolean }} [opts]
 * @returns {object[]}
 */
export function collectGridLetterTiles(grid, rows, cols, excludedPositionKeys = null, opts = {}) {
  /** @type {object[]} */
  const out = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excludedPositionKeys?.has(`${r},${c}`)) continue;
      const t = grid[r]?.[c];
      if (!t?.letter) continue;
      if (opts.excludeBossDebuffed && t.bossTileDebuffed === true) continue;
      out.push(t);
    }
  }
  return out;
}

const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** @param {readonly { rarity?: string }[]} tiles */
export function highestRarityAmongTiles(tiles) {
  let best = "common";
  let bestRank = 0;
  for (const t of tiles ?? []) {
    const r = String(t?.rarity ?? "common");
    const rank = RARITY_RANK[r] ?? 0;
    if (rank > bestRank) {
      bestRank = rank;
      best = r;
    }
  }
  return best;
}

/**
 * 词典整词 → 牌库逐字母移除序列（`Qu` 一格计两字母时，以整词为准如 qua → q,u,a）。
 * @param {string | null | undefined} resolvedWord
 * @param {{ letter?: string }[]} [tiles] 无整词时回退为各格 letter 拼接后拆字
 * @returns {string[]}
 */
export function resolvedWordToRemovalLetterRaws(resolvedWord, tiles = null) {
  const w = String(resolvedWord ?? "").toLowerCase().trim();
  if (w) return [...w];
  if (!Array.isArray(tiles) || tiles.length === 0) return [];
  const joined = tiles.map((t) => String(t?.letter ?? "").toLowerCase()).join("");
  return joined ? [...joined] : [];
}

export function buildTreasureLogicConditions(tiles, letterParts, ownedSlotTreasureIds = null) {
  return {
    streakOk: hasConsecutiveDuplicateLetters(tiles),
    tripleOk: hasTripleLetterCount(tiles),
    uniqueOk: hasAllUniqueLetters(tiles),
    threeRaritiesOk: distinctRarityCount(letterParts, ownedSlotTreasureIds) >= 3,
    uniformOk: allUniformRarity(letterParts, ownedSlotTreasureIds),
    shortWordOk: (tiles?.length ?? 0) > 0 && tiles.length <= 3,
  };
}
