import {
  bossHasWholeWordSoftRule,
  evaluateBossSoftWordViolation,
  evaluateBossSoftWordViolationWithPostSubmitLength,
  getEndingLetterRarityForResolvedWord,
} from "./bossWordViolation.js";
import { resolveUniqueMostSpellLength } from "./spellLengthCounts.js";
import { resolveLengthUpgradeLen } from "./wordLengthBalance.js";

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
 * 报纸等提交后加长：任一侧不触发「最常长度」则不归零（对玩家有利）。
 * @param {number} baseJudgedLen
 * @param {number} finalJudgedLen
 * @param {Record<string | number, number> | null | undefined} counts
 */
export function evaluateOxBossHitWithPostSubmitLength(baseJudgedLen, finalJudgedLen, counts) {
  const base = Math.max(0, Math.floor(Number(baseJudgedLen)) || 0);
  const final = Math.max(0, Math.floor(Number(finalJudgedLen)) || 0);
  if (base < 1 && final < 1) return false;
  if (base < 1 || final < 1 || base === final) {
    return evaluateOxBossHit(base || final, counts);
  }
  return evaluateOxBossHit(base, counts) && evaluateOxBossHit(final, counts);
}

/**
 * 公牛 Boss：当前选词是否将触发「最常拼写长度 → 资金归零」。
 * @param {Object} p
 * @param {boolean} p.dictionaryReady
 * @param {string} p.slug
 * @param {string | null} p.resolvedWord
 * @param {string} p.effectiveWord
 * @param {number} p.judgedLen 最终判定词长
 * @param {number} [p.baseJudgedLen] 不含报纸 append 的原词判定词长
 * @param {Record<string | number, number> | null | undefined} p.spellCountsByLength
 */
export function evaluateOxBossViolationPreview(p) {
  if (!p.dictionaryReady) return false;
  if (String(p.slug ?? "") !== "the_ox") return false;
  if (p.resolvedWord == null) return false;
  if (!p.effectiveWord || p.effectiveWord.length < 1) return false;
  const finalWordLen = Math.max(0, Math.floor(Number(p.judgedLen)) || 0);
  if (finalWordLen < 1) return false;
  const baseWordLen =
    p.baseJudgedLen != null && Number.isFinite(Number(p.baseJudgedLen))
      ? Math.max(0, Math.floor(Number(p.baseJudgedLen)) || 0)
      : finalWordLen;
  return evaluateOxBossHitWithPostSubmitLength(baseWordLen, finalWordLen, p.spellCountsByLength);
}

/**
 * 报纸加长后的 Boss 词长记账（冷眼已用 / 独眼锁定 / 拼写次数统计）。
 * 长度软规则下：原词已通过则记原长，否则记最终长（救回）；其它 Boss 记原长更有利。
 * @param {{
 *   slug: string,
 *   baseWordLen: number,
 *   finalWordLen: number,
 *   resolvedWord: string,
 *   endingLetterRarity?: string,
 *   getWordDefinition: (w: string) => unknown,
 *   usedLengthsThisLevel: Set<number>,
 *   mouthLockedLength: number | null,
 *   clubRequiredKey: string | null,
 *   ownedSlotTreasureIds?: (string | null | undefined)[],
 * }} ctx
 */
export function resolvePostSubmitAppendBookkeepingLen(ctx) {
  const base = Math.max(0, Math.round(Number(ctx.baseWordLen)) || 0);
  const final = Math.max(0, Math.round(Number(ctx.finalWordLen)) || 0);
  if (base < 1) return final;
  if (final < 1 || base === final) return final || base;

  const slug = String(ctx.slug ?? "");
  const lengthSoft = slug === "the_psychic" || slug === "the_eye" || slug === "the_mouth";
  if (lengthSoft) {
    const baseSoft = evaluateBossSoftWordViolation({
      slug,
      wordLen: base,
      resolvedWord: ctx.resolvedWord,
      endingLetterRarity: ctx.endingLetterRarity,
      getWordDefinition: ctx.getWordDefinition,
      usedLengthsThisLevel: ctx.usedLengthsThisLevel,
      mouthLockedLength: ctx.mouthLockedLength,
      clubRequiredKey: ctx.clubRequiredKey,
      ownedSlotTreasureIds: ctx.ownedSlotTreasureIds,
    });
    if (!baseSoft.violated) return base;
    return final;
  }
  return base;
}

/**
 * 胳膊 Boss：报纸加长时选择降级伤害更小的词长槽（等级更低或已为 1 无实质伤害）。
 * @param {number} baseJudgedLen
 * @param {number} finalJudgedLen
 * @param {Record<string | number, number> | null | undefined} lengthLevelsByLength
 * @returns {number | null} 可升级表键（3–16）
 */
export function resolveArmBossDowngradeLen(baseJudgedLen, finalJudgedLen, lengthLevelsByLength) {
  const baseKey = resolveLengthUpgradeLen(baseJudgedLen);
  const finalKey = resolveLengthUpgradeLen(finalJudgedLen);
  if (baseKey == null) return finalKey;
  if (finalKey == null || baseKey === finalKey) return finalKey ?? baseKey;
  const levels = lengthLevelsByLength ?? {};
  const baseLevel = Math.max(1, Math.round(Number(levels[baseKey])) || 1);
  const finalLevel = Math.max(1, Math.round(Number(levels[finalKey])) || 1);
  if (baseLevel <= 1 && finalLevel > 1) return baseKey;
  if (finalLevel <= 1 && baseLevel > 1) return finalKey;
  return baseLevel <= finalLevel ? baseKey : finalKey;
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
 * @param {number} p.judgedLen 最终判定词长（含报纸等；兼容旧调用）
 * @param {number} [p.baseJudgedLen] 不含报纸等 append 的原词判定词长；缺省则与 judgedLen 相同
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
  const finalWordLen = Math.max(0, Math.round(Number(p.judgedLen)) || 0);
  const baseWordLen =
    p.baseJudgedLen != null && Number.isFinite(Number(p.baseJudgedLen))
      ? Math.max(0, Math.round(Number(p.baseJudgedLen)) || 0)
      : finalWordLen;
  const soft = evaluateBossSoftWordViolationWithPostSubmitLength({
    slug: p.slug,
    baseWordLen,
    finalWordLen,
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
