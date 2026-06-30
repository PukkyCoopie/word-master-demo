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
 * 整局各词长拼写次数中唯一最多者的词长；并列最多或无记录时返回 null。
 * @param {Record<string | number, number> | Map<number, number> | null | undefined} counts
 * @returns {number | null}
 */
export function resolveUniqueMostSpellLength(counts) {
  if (!counts) return null;
  /** @type {[number, number][]} */
  const entries =
    counts instanceof Map
      ? [...counts.entries()]
      : Object.entries(counts).map(([k, v]) => [Math.floor(Number(k) || 0), Math.floor(Number(v) || 0)]);

  let bestN = 0;
  let bestLen = /** @type {number | null} */ (null);
  let tied = false;
  for (const [len, n] of entries) {
    const L = Math.max(0, Math.floor(Number(len) || 0));
    const c = Math.max(0, Math.floor(Number(n) || 0));
    if (L <= 0 || c <= 0) continue;
    if (c > bestN) {
      bestN = c;
      bestLen = L;
      tied = false;
    } else if (c === bestN) {
      tied = true;
    }
  }
  if (bestLen == null || tied) return null;
  return bestLen;
}

/**
 * @param {number} judgedLen
 * @param {Record<number, number>} counts
 */
export function evaluateOxBossHit(judgedLen, counts) {
  const most = resolveUniqueMostSpellLength(counts);
  if (most == null) return false;
  return judgedLen === most;
}

/**
 * 牛 Boss：当前选词是否将触发「最常拼写长度 → 资金归零」。
 * @param {Object} p
 * @param {boolean} p.dictionaryReady
 * @param {string} p.slug
 * @param {string | null} p.resolvedWord
 * @param {string} p.effectiveWord
 * @param {number} p.judgedLen
 * @param {Record<string | number, number> | null | undefined} p.spellCountsByLength
 */
export function evaluateOxBossViolationPreview(p) {
  if (!p.dictionaryReady) return false;
  if (String(p.slug ?? "") !== "the_ox") return false;
  if (p.resolvedWord == null) return false;
  if (!p.effectiveWord || p.effectiveWord.length < 1) return false;
  const judgedLen = Math.max(0, Math.floor(Number(p.judgedLen)) || 0);
  if (judgedLen < 1) return false;
  return evaluateOxBossHit(judgedLen, p.spellCountsByLength);
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
