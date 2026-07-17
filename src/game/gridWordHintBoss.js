import { evaluateBossSoftWordViolationWithPostSubmitLength } from "./bossWordViolation.js";
import { isBossEffectsSuppressedByTreasures } from "./treasureBossSuppress.js";
import { resolveUniqueMostSpellLength } from "./spellLengthCounts.js";
import {
  BASE_LENGTH_TABLE_LEVEL,
  getLengthTableLevel,
  hintJudgedLengthForActual,
} from "./gridWordHintLength.js";

/**
 * @typedef {import('./bossWordViolation.js').BossWildcardResolveContext} BossWildcardResolveContext
 * @typedef {import('./gridWordHintLength.js').HintLengthContext} HintLengthContext
 * @typedef {import('./gridWordFinder.js').GridCell} GridCell
 */

const LETTER_RARITY_BUCKETS = Object.freeze({
  common: new Set(["a", "d", "e", "g", "i", "l", "n", "o", "r", "s", "t", "u"]),
  rare: new Set(["b", "c", "f", "h", "m", "p", "v", "w", "y"]),
  epic: new Set(["j", "k"]),
  legendary: new Set(["q", "x", "z"]),
});

/**
 * @param {string} ch
 * @returns {string}
 */
function baseLetterRarity(ch) {
  const c = String(ch ?? "").toLowerCase();
  for (const [rarity, set] of Object.entries(LETTER_RARITY_BUCKETS)) {
    if (set.has(c)) return rarity;
  }
  return "common";
}

/**
 * @param {string | null | undefined} resolvedWord
 * @returns {number}
 */
function hintResolvedWordLetterCount(resolvedWord) {
  return String(resolvedWord ?? "").toLowerCase().trim().length;
}

/**
 * @param {GridCell[] | null | undefined} path
 * @param {string} resolvedWord
 * @returns {string}
 */
function hintEndingLetterRarity(path, resolvedWord) {
  const last = path?.[path.length - 1];
  if (!last) return "common";
  if (!last.isWildcard) return String(last.rarity ?? "common");
  const w = String(resolvedWord ?? "").toLowerCase().trim();
  if (!w) return "common";
  return baseLetterRarity(w[w.length - 1]);
}

/**
 * 按 Boss 规则调整长度权重池（返回新数组；weight 可含 0 表示排除）。
 * @param {readonly { kind: 'exact', len: number, weight: number }[]} baseWeights
 * @param {BossWildcardResolveContext | null | undefined} bossCtx
 * @param {Record<string | number, number> | Map<number, number> | null | undefined} spellCountsByLength
 * @param {HintLengthContext | null | undefined} [hintLengthCtx]
 * @returns {{ kind: 'exact', len: number, weight: number }[]}
 */
export function applyBossHintLengthWeights(
  baseWeights,
  bossCtx,
  spellCountsByLength,
  hintLengthCtx = null,
) {
  const slug = String(bossCtx?.slug ?? "");
  const getJudged = hintLengthCtx?.getJudgedLengthTableLen ?? ((n) => n);
  const lengthLevels = hintLengthCtx?.lengthLevelsByLength ?? {};
  /** @type {{ kind: 'exact', len: number, weight: number }[]} */
  let weights = baseWeights.map((e) => ({ ...e }));

  const scaleLen = (len, factor) => {
    const ix = weights.findIndex((e) => e.len === len);
    if (ix >= 0) weights[ix] = { ...weights[ix], weight: Math.max(0, weights[ix].weight * factor) };
  };

  const judgedLenForActual = (actualLen) => hintJudgedLengthForActual(actualLen, getJudged);

  const excludeActualWhereJudged = (pred) => {
    weights = weights.map((e) => (pred(judgedLenForActual(e.len)) ? { ...e, weight: 0 } : e));
  };

  if (slug === "the_psychic") {
    weights = weights.map((e) => ({
      ...e,
      weight: judgedLenForActual(e.len) === 5 ? e.weight || 1 : 0,
    }));
    return weights.filter((e) => e.weight > 0);
  }

  if (slug === "the_mouth") {
    const locked = bossCtx?.mouthLockedLength;
    if (locked != null && Number.isFinite(locked)) {
      weights = weights.map((e) => ({
        ...e,
        weight: judgedLenForActual(e.len) === locked ? e.weight || 1 : 0,
      }));
      return weights.filter((e) => e.weight > 0);
    }
  }

  if (slug === "the_eye") {
    const used = bossCtx?.usedLengthsThisLevel;
    if (used instanceof Set && used.size > 0) {
      excludeActualWhereJudged((j) => used.has(j));
    }
  }

  if (slug === "the_ox") {
    const oxJudged = resolveUniqueMostSpellLength(spellCountsByLength);
    if (oxJudged != null) {
      excludeActualWhereJudged((j) => j === oxJudged);
    }
  }

  if (slug === "the_tooth") {
    scaleLen(3, 1.6);
    scaleLen(4, 1.4);
    scaleLen(6, 0.5);
    scaleLen(7, 0.35);
  }

  if (slug === "the_arm") {
    const baseLevelEntries = weights.filter((e) => {
      if (e.weight <= 0) return false;
      const judged = judgedLenForActual(e.len);
      return getLengthTableLevel(judged, lengthLevels) === BASE_LENGTH_TABLE_LEVEL;
    });
    if (baseLevelEntries.length) return baseLevelEntries;
  }

  if (slug === "the_needle") {
    scaleLen(6, 1.5);
    scaleLen(7, 1.8);
    scaleLen(5, 1.2);
  }

  if (slug === "the_wall" || slug === "violet_vessel" || slug === "the_flint") {
    scaleLen(5, 1.2);
    scaleLen(6, 1.35);
  }

  if (slug === "the_noble_end") {
    scaleLen(5, 1.15);
    scaleLen(6, 1.25);
    scaleLen(7, 1.2);
  }

  return weights.filter((e) => e.weight > 0);
}

/**
 * @param {GridCell[] | null | undefined} path
 * @returns {object[]}
 */
export function hintPathToSubmitTiles(path) {
  return (path ?? []).map((cell) => ({
    letter: cell.isWildcard ? "?" : String(cell.letter ?? ""),
    rarity: String(cell.rarity ?? "common"),
    isWildcard: cell.isWildcard === true,
    materialId: cell.isWildcard ? "wildcard" : undefined,
  }));
}

/**
 * @param {import('./gridWordFinder.js').WordPick} pick
 * @param {BossWildcardResolveContext | null | undefined} bossCtx
 * @returns {BossWildcardResolveContext | null | undefined}
 */
export function buildBossHintEvaluateContext(pick, bossCtx) {
  if (!bossCtx?.slug || !pick?.word) return bossCtx;
  const getJudgedLengthTableLen =
    typeof bossCtx.getJudgedLengthTableLen === "function"
      ? bossCtx.getJudgedLengthTableLen
      : (n) => Math.max(0, Math.floor(Number(n) || 0));
  const tiles = hintPathToSubmitTiles(pick.path);
  const judgedPartial = (resolvedWord, extra = {}) => ({
    tiles,
    resolvedWord,
    getWordDefinition: bossCtx.getWordDefinition,
    ...extra,
  });
  return {
    ...bossCtx,
    tiles,
    getJudgedWordLen(resolvedWord) {
      return getJudgedLengthTableLen(
        hintResolvedWordLetterCount(resolvedWord),
        judgedPartial(resolvedWord),
      );
    },
    getBaseJudgedWordLen(resolvedWord) {
      return getJudgedLengthTableLen(
        hintResolvedWordLetterCount(resolvedWord),
        judgedPartial(resolvedWord, { excludeAppendPairedContentBonus: true }),
      );
    },
    getEndingLetterRarity(resolvedWord) {
      return hintEndingLetterRarity(pick.path, resolvedWord);
    },
  };
}

/**
 * 与 `evaluateBossSoftWordViolationWithPostSubmitLength` 对齐：违规返回 true。
 * @param {import('./gridWordFinder.js').WordPick} pick
 * @param {BossWildcardResolveContext | null | undefined} bossCtx
 * @returns {boolean}
 */
function hintViolatesBossSoftWordRule(pick, bossCtx) {
  if (!bossCtx?.slug) return false;
  if (isBossEffectsSuppressedByTreasures(bossCtx.ownedSlotTreasureIds)) return false;

  const w = String(pick.word ?? "").toLowerCase().trim();
  if (!w) return true;

  const finalWordLen =
    typeof bossCtx.getJudgedWordLen === "function"
      ? bossCtx.getJudgedWordLen(w)
      : hintResolvedWordLetterCount(w);
  const baseWordLen =
    typeof bossCtx.getBaseJudgedWordLen === "function"
      ? bossCtx.getBaseJudgedWordLen(w)
      : finalWordLen;

  return evaluateBossSoftWordViolationWithPostSubmitLength({
    slug: bossCtx.slug,
    baseWordLen,
    finalWordLen,
    resolvedWord: w,
    endingLetterRarity:
      typeof bossCtx.getEndingLetterRarity === "function"
        ? bossCtx.getEndingLetterRarity(w)
        : hintEndingLetterRarity(pick.path, w),
    getWordDefinition: bossCtx.getWordDefinition,
    usedLengthsThisLevel: bossCtx.usedLengthsThisLevel ?? new Set(),
    mouthLockedLength: bossCtx.mouthLockedLength ?? null,
    clubRequiredKey: bossCtx.clubRequiredKey ?? null,
    ownedSlotTreasureIds: bossCtx.ownedSlotTreasureIds,
  }).violated;
}

/**
 * @param {import('./gridWordFinder.js').WordPick | null | undefined} pick
 * @param {BossWildcardResolveContext | null | undefined} bossCtx
 * @returns {boolean}
 */
export function isHintPickAcceptable(pick, bossCtx) {
  if (!pick?.word) return false;
  if (!bossCtx?.slug) return true;
  const hintCtx = buildBossHintEvaluateContext(pick, bossCtx);
  return !hintViolatesBossSoftWordRule(pick, hintCtx);
}
