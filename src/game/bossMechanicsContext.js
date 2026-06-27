import {
  bossHasWholeWordSoftRule,
  evaluateBossSoftWordViolation,
  getEndingLetterRarityForResolvedWord,
} from "./bossWordViolation.js";

/** @param {string} slug */
export function isManacleBossGrid(slug) {
  return slug === "the_manacle";
}

/** @param {string} slug */
export function isAmberBossMaskActive(slug) {
  return slug === "amber_acorn";
}

/** @param {string} slug */
export function isCrimsonBossMechanicsActive(slug) {
  return slug === "crimson_heart";
}

/** @param {string} slug */
export function isFlintBossActive(slug) {
  return slug === "the_flint";
}

/**
 * @param {readonly (object | null)[]} ownedTreasures
 * @param {() => number} rng
 * @returns {number | null}
 */
export function pickCrimsonDisabledTreasureSlotIndex(ownedTreasures, rng) {
  /** @type {number[]} */
  const idxs = [];
  for (let i = 0; i < ownedTreasures.length; i++) {
    if (ownedTreasures[i]?.treasureId) idxs.push(i);
  }
  if (!idxs.length) return null;
  return idxs[Math.floor(rng() * idxs.length)];
}

/**
 * @param {number} judgedLen
 * @param {Record<number, number>} counts
 */
export function evaluateOxBossHit(judgedLen, counts) {
  let bestN = -1;
  let bestLen = /** @type {number | null} */ (null);
  for (let L = 3; L <= 16; L++) {
    const n = Math.max(0, Math.floor(Number(counts[L]) || 0));
    if (n <= 0) continue;
    if (n > bestN || (n === bestN && bestLen != null && L < bestLen)) {
      bestN = n;
      bestLen = L;
    }
  }
  if (bestLen == null) return false;
  return judgedLen === bestLen;
}

/**
 * @param {unknown[]} arr
 * @param {() => number} rng
 */
export function shuffleArrayInPlace(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
}

/**
 * @param {object[][]} grid
 * @param {number} rows
 * @param {number} cols
 * @param {number} count
 * @param {() => number} rng
 * @returns {{ r: number, c: number }[]}
 */
export function pickHookBossDebuffTargets(grid, rows, cols, count, rng) {
  /** @type {{ r: number, c: number }[]} */
  const pool = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = grid[r]?.[c];
      if (!t?.letter || t.bossGridBlocked || t.bossTileDebuffed) continue;
      pool.push({ r, c });
    }
  }
  shuffleArrayInPlace(pool, rng);
  return pool.slice(0, Math.min(count, pool.length));
}

/**
 * @param {object[][]} grid
 * @param {readonly { r: number, c: number }[]} targets
 */
export function applyHookBossDebuffTargets(grid, targets) {
  for (const { r, c } of targets) {
    const t = grid[r]?.[c];
    if (t) t.bossTileDebuffed = true;
  }
}

/**
 * @param {object[][]} grid
 * @param {number} rows
 * @param {number} cols
 */
export function clearVerdantDebuffsOnGrid(grid, rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = grid[r]?.[c];
      if (t && !t.bossGridBlocked) t.bossTileDebuffed = false;
    }
  }
}

/**
 * @param {Object} p
 * @param {boolean} p.dictionaryReady
 * @param {string} p.slug
 * @param {string | null} p.resolvedWord
 * @param {string} p.effectiveWord
 * @param {readonly unknown[]} p.tiles
 * @param {number} p.judgedLen
 * @param {(tiles: readonly unknown[], word: string | null) => string} p.getEndingLetterRarity
 * @param {(word: string) => unknown} p.getWordDefinition
 * @param {ReadonlySet<number>} p.usedLengthsThisLevel
 * @param {number | null} p.mouthLockedLength
 * @param {string} p.clubRequiredKey
 * @param {readonly string[]} p.ownedSlotTreasureIds
 */
export function evaluateBossSoftWordViolationPreview(p) {
  if (!p.dictionaryReady) return false;
  if (!bossHasWholeWordSoftRule(p.slug)) return false;
  if (p.resolvedWord == null) return false;
  if (!p.effectiveWord || p.effectiveWord.length < 1) return false;
  const soft = evaluateBossSoftWordViolation({
    slug: p.slug,
    wordLen: p.judgedLen,
    resolvedWord: p.resolvedWord,
    endingLetterRarity: p.getEndingLetterRarity(p.tiles, p.resolvedWord),
    getWordDefinition: p.getWordDefinition,
    usedLengthsThisLevel: p.usedLengthsThisLevel,
    mouthLockedLength: p.mouthLockedLength,
    clubRequiredKey: p.clubRequiredKey,
    ownedSlotTreasureIds: p.ownedSlotTreasureIds,
  });
  return soft.violated;
}
