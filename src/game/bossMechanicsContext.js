import {
  bossHasWholeWordSoftRule,
  evaluateBossSoftWordViolation,
  getEndingLetterRarityForResolvedWord,
} from "./bossWordViolation.js";
import { resolveUniqueMostSpellLength } from "./spellLengthCounts.js";

export { resolveUniqueMostSpellLength };

/** @param {string} slug */
export function isManacleBossGrid(slug) {
  return slug === "the_manacle";
}

/** 镣铐顶行封锁；入场 stagger 按可玩区计时的首行索引（下落偏移仍按完整棋盘行；其余 Boss 为 0）。 */
export const MANACLE_PLAYABLE_TOP_ROW = 1;

/** @param {string} slug @returns {number} */
export function getPlayableTopRowForBoss(slug) {
  return isManacleBossGrid(slug) ? MANACLE_PLAYABLE_TOP_ROW : 0;
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
 * @param {Set<number> | readonly number[] | null | undefined} dis
 * @returns {Set<number> | null}
 */
export function normalizeDisabledTreasureSlotIndices(dis) {
  if (dis instanceof Set) return dis.size ? dis : null;
  if (Array.isArray(dis)) {
    const set = new Set(dis.map((x) => Math.floor(Number(x))).filter((i) => i >= 0));
    return set.size ? set : null;
  }
  return null;
}

/**
 * 本手计分 / 动效：将禁用槽位上的宝藏 id 置空，与 `computeWordScoreDetailedForSubmit` 一致。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {Set<number> | readonly number[] | null | undefined} disabledSlotIndices
 * @returns {(string | null)[]}
 */
export function applyDisabledTreasureSlots(ownedSlotTreasureIds, disabledSlotIndices) {
  const raw = ownedSlotTreasureIds ?? [];
  const disabledSet = normalizeDisabledTreasureSlotIndices(disabledSlotIndices);
  if (!disabledSet) return raw.map((tid) => (tid == null || tid === "" ? null : String(tid)));
  return raw.map((tid, si) =>
    disabledSet.has(si) ? null : tid == null || tid === "" ? null : String(tid),
  );
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {Set<number> | readonly number[] | null | undefined} disabledSlotIndices
 * @param {string} treasureId
 */
export function isTreasureIdDisabledForSubmit(ownedSlotTreasureIds, disabledSlotIndices, treasureId) {
  const tid = String(treasureId ?? "").trim();
  if (!tid) return false;
  const disabledSet = normalizeDisabledTreasureSlotIndices(disabledSlotIndices);
  if (!disabledSet) return false;
  const slots = ownedSlotTreasureIds ?? [];
  for (const si of disabledSet) {
    if (String(slots[si] ?? "") === tid) return true;
  }
  return false;
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
 * 公牛 Boss：当前选词是否将触发「最常拼写长度 → 资金归零」。
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
