/**
 * 拼词提示：按词长权重在棋盘 multiset 上匹配词典候选。
 * @typedef {import('./gridWordFinder.js').GridCell} GridCell
 * @typedef {import('./gridWordFinder.js').WordPick} WordPick
 * @typedef {import('./bossWordViolation.js').BossWildcardResolveContext} BossWildcardResolveContext
 * @typedef {import('./gridWordHintLength.js').HintLengthContext} HintLengthContext
 */

import {
  assignCellsToWord,
  countDebuffedLettersInPath,
  pickedLetterMultiset,
  wordMatchesMultiset,
} from "./gridWordFinder.js";
import { applyBossHintLengthWeights, isHintPickAcceptable } from "./gridWordHintBoss.js";
import { hintWordStartLetterFromCell } from "./gridWordHintLength.js";

/** 与 gridWordHintLexical.HINT_LEXICAL_TIER 一致 */
const HINT_LEXICAL_TIER_NORMAL_POS = 3;
const HINT_LEXICAL_TIER_NO_POS = 2;
const HINT_LEXICAL_TIER_ABBR_ONLY = 1;

export const MIN_WORD_LEN = 3;
const MAX_WORD_LEN = 12;
const DEFAULT_MAX_CHECKS_PER_LENGTH = 500;
const MAX_LENGTH_RETRIES = 6;

/** @type {readonly { kind: 'exact', len: number, weight: number }[]} */
export const EXACT_LENGTH_WEIGHTS = Object.freeze([
  { kind: "exact", len: 5, weight: 40 },
  { kind: "exact", len: 4, weight: 25 },
  { kind: "exact", len: 6, weight: 15 },
  { kind: "exact", len: 7, weight: 5 },
  { kind: "exact", len: 3, weight: 5 },
]);

const OTHER_LENGTH_WEIGHT = 10;
const OTHER_LENGTH_MIN = 8;

/**
 * @param {number} [shift]
 * @returns {{ kind: 'exact', len: number, weight: number }[]}
 */
export function buildExactLengthWeights(shift = 0) {
  const s = Math.max(0, Math.floor(Number(shift) || 0));
  return EXACT_LENGTH_WEIGHTS.map((e) => ({
    kind: "exact",
    len: e.len + s,
    weight: e.weight,
  })).filter((e) => e.len >= MIN_WORD_LEN);
}

/**
 * @param {() => number} [rng]
 * @returns {number}
 */
function defaultRng(rng) {
  return typeof rng === "function" ? rng() : Math.random();
}

/**
 * @param {() => number} rng
 * @param {number} exclusive
 * @returns {number}
 */
function randomIntBelow(rng, exclusive) {
  const span = Math.max(0, Math.floor(Number(exclusive) || 0));
  if (span <= 0) return 0;
  const r = defaultRng(rng);
  return Math.min(span - 1, Math.floor(r * span));
}

/**
 * 从词典长度桶中随机抽取最多 maxChecks 个互不重复下标，避免按字母序只扫前段。
 * @param {number} length
 * @param {number} maxChecks
 * @param {() => number} rng
 * @returns {number[]}
 */
function buildRandomCandidateCheckOrder(length, maxChecks, rng) {
  const n = Math.max(0, Math.floor(Number(length) || 0));
  const k = Math.min(Math.max(0, Math.floor(Number(maxChecks) || 0)), n);
  const indices = new Array(n);
  for (let i = 0; i < n; i += 1) indices[i] = i;
  for (let i = 0; i < k; i += 1) {
    const j = i + randomIntBelow(rng, n - i);
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return indices.slice(0, k);
}

/**
 * @param {readonly { kind: 'exact', len: number, weight: number }[]} exactWeights
 * @param {boolean} includeOther
 */
function buildActiveWeightEntries(exactWeights, includeOther) {
  /** @type {{ kind: 'exact' | 'other', len?: number, weight: number }[]} */
  const out = exactWeights.map((e) => ({ kind: "exact", len: e.len, weight: e.weight }));
  if (includeOther) out.push({ kind: "other", weight: OTHER_LENGTH_WEIGHT });
  return out;
}

/**
 * @param {{ kind: 'exact' | 'other', len?: number, weight: number }[]} entries
 * @param {number} maxLen
 * @param {() => number} rng
 * @returns {number | null}
 */
function sampleTargetLength(entries, maxLen, rng) {
  /** @type {{ len: number, weight: number }[]} */
  const resolved = [];
  for (const entry of entries) {
    if (entry.kind === "exact") {
      const len = entry.len ?? 0;
      if (len >= MIN_WORD_LEN && len <= maxLen && entry.weight > 0) {
        resolved.push({ len, weight: entry.weight });
      }
      continue;
    }
    if (maxLen >= OTHER_LENGTH_MIN && entry.weight > 0) {
      const hi = Math.min(MAX_WORD_LEN, maxLen);
      const lo = OTHER_LENGTH_MIN;
      const len = lo + Math.floor(defaultRng(rng) * (hi - lo + 1));
      resolved.push({ len, weight: entry.weight });
    }
  }
  if (!resolved.length) return null;

  const total = resolved.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let roll = defaultRng(rng) * total;
  for (const e of resolved) {
    roll -= e.weight;
    if (roll <= 0) return e.len;
  }
  return resolved[resolved.length - 1].len;
}

/**
 * @typedef {Object} PickRandomWordAtLengthOpts
 * @property {BossWildcardResolveContext | null} [bossResolveContext]
 * @property {GridCell | null} [anchorCell]
 * @property {string} [requiredStartLetter]
 * @property {(word: string) => number} [getHintLexicalTierForWord]
 * @property {(word: string) => number} [getHintLexicalPickWeight]
 * @property {(word: string) => boolean} [getHintWordIsFallbackOnly]
 */

/** @type {readonly number[]} */
const HINT_LEXICAL_PASS_MIN_TIERS = [
  HINT_LEXICAL_TIER_NORMAL_POS,
  HINT_LEXICAL_TIER_NO_POS,
  HINT_LEXICAL_TIER_ABBR_ONLY,
];

const DEFAULT_HINT_LEXICAL_TIER = HINT_LEXICAL_TIER_NORMAL_POS;
const DEFAULT_HINT_LEXICAL_PICK_WEIGHT = 1;

/**
 * @param {import('./bossWordViolation.js').BossWildcardResolveContext | null | undefined} bossCtx
 * @param {PickHintWordOptions} options
 * @returns {import('./bossWordViolation.js').BossWildcardResolveContext | null}
 */
function enrichBossResolveContextForHint(bossCtx, options) {
  if (!bossCtx) return null;
  if (typeof bossCtx.getJudgedLengthTableLen === "function") return bossCtx;
  if (typeof options.getJudgedLengthTableLen !== "function") return bossCtx;
  return {
    ...bossCtx,
    getJudgedLengthTableLen: options.getJudgedLengthTableLen,
  };
}

/**
 * @param {GridCell[]} cells
 * @param {number} L
 * @param {ReturnType<typeof pickedLetterMultiset>} gridMs
 * @param {(len: number) => string[] | undefined} getCandidatesByLength
 * @param {(pattern: string, wc?: string) => string | null} resolveWordPattern
 * @param {() => number} rng
 * @param {number} maxChecks
 * @param {PickRandomWordAtLengthOpts} opts
 * @param {number} minLexicalTier
 * @param {boolean} allowFallbackOnlyWords
 * @returns {WordPick | null}
 */
function pickRandomWordAtLengthWithMinLexicalTier(
  cells,
  L,
  gridMs,
  getCandidatesByLength,
  resolveWordPattern,
  rng,
  maxChecks,
  opts,
  minLexicalTier,
  allowFallbackOnlyWords,
) {
  const bossResolveContext = opts.bossResolveContext ?? null;
  const anchorCell = opts.anchorCell ?? null;
  const requiredStartLetter = opts.requiredStartLetter ?? "";
  const tierForWord = opts.getHintLexicalTierForWord ?? (() => DEFAULT_HINT_LEXICAL_TIER);
  const lexicalWeightForWord = opts.getHintLexicalPickWeight ?? (() => DEFAULT_HINT_LEXICAL_PICK_WEIGHT);
  const wordIsFallbackOnly = opts.getHintWordIsFallbackOnly ?? (() => false);

  const candidates = getCandidatesByLength(L);
  if (!Array.isArray(candidates) || !candidates.length) return null;

  const checkOrder = buildRandomCandidateCheckOrder(candidates.length, maxChecks, rng);

  /** @type {WordPick | null} */
  let pick = null;
  let totalWeight = 0;

  for (const idx of checkOrder) {
    const word = candidates[idx];
    if (tierForWord(word) < minLexicalTier) continue;
    if (requiredStartLetter && word[0] !== requiredStartLetter) continue;
    if (!wordMatchesMultiset(word, gridMs)) continue;
    const path = assignCellsToWord(word, cells, { anchor: anchorCell });
    if (!path) continue;
    const pattern = path
      .map((c) => (c.isWildcard ? "?" : c.letter.toLowerCase()))
      .join("");
    const resolved = resolveWordPattern(pattern, "?");
    if (!resolved || resolved !== word) continue;

    const candidatePick = { word: resolved, path, pattern };
    if (!isHintPickAcceptable(candidatePick, bossResolveContext)) {
      continue;
    }
    if (!allowFallbackOnlyWords && wordIsFallbackOnly(resolved)) {
      continue;
    }

    const debuffN = countDebuffedLettersInPath(path);
    const w = lexicalWeightForWord(resolved) / (1 + debuffN);
    totalWeight += w;
    if (defaultRng(rng) < w / totalWeight) {
      pick = candidatePick;
    }
  }
  return pick;
}

/**
 * @param {GridCell[]} cells
 * @param {number} L
 * @param {ReturnType<typeof pickedLetterMultiset>} gridMs
 * @param {(len: number) => string[] | undefined} getCandidatesByLength
 * @param {(pattern: string, wc?: string) => string | null} resolveWordPattern
 * @param {() => number} rng
 * @param {number} [maxChecks]
 * @param {PickRandomWordAtLengthOpts | BossWildcardResolveContext | null} [optsOrBossCtx]
 * @returns {WordPick | null}
 */
export function pickRandomWordAtLength(
  cells,
  L,
  gridMs,
  getCandidatesByLength,
  resolveWordPattern,
  rng = Math.random,
  maxChecks = DEFAULT_MAX_CHECKS_PER_LENGTH,
  optsOrBossCtx = null,
) {
  const opts =
    optsOrBossCtx && typeof optsOrBossCtx === "object" && "slug" in optsOrBossCtx
      ? { bossResolveContext: optsOrBossCtx }
      : optsOrBossCtx ?? {};

  for (const allowFallbackOnly of [false, true]) {
    for (const minTier of HINT_LEXICAL_PASS_MIN_TIERS) {
      const pick = pickRandomWordAtLengthWithMinLexicalTier(
        cells,
        L,
        gridMs,
        getCandidatesByLength,
        resolveWordPattern,
        rng,
        maxChecks,
        opts,
        minTier,
        allowFallbackOnly,
      );
      if (pick) return pick;
    }
  }
  return null;
}

/**
 * @typedef {Object} PickHintWordOptions
 * @property {number} [lengthWeightShift]
 * @property {BossWildcardResolveContext | null} [bossResolveContext]
 * @property {Record<string | number, number> | Map<number, number>} [spellCountsByLength]
 * @property {(n: number) => number} [getJudgedLengthTableLen]
 * @property {Record<string | number, number>} [lengthLevelsByLength]
 * @property {GridCell | null} [ceruleanAnchorCell]
 * @property {(word: string) => number} [getHintLexicalTierForWord]
 * @property {(word: string) => number} [getHintLexicalPickWeight]
 * @property {(word: string) => boolean} [getHintWordIsFallbackOnly]
 */

/**
 * @param {GridCell[]} cells
 * @param {(len: number) => string[] | undefined} getCandidatesByLength
 * @param {(pattern: string, wc?: string) => string | null} resolveWordPattern
 * @param {() => number} rng
 * @param {PickHintWordOptions} options
 * @param {number} maxLen
 * @param {ReturnType<typeof pickedLetterMultiset>} gridMs
 * @param {HintLengthContext} hintLengthCtx
 * @returns {WordPick | null}
 */
function pickHintWordWithLengthPool(
  cells,
  getCandidatesByLength,
  resolveWordPattern,
  rng,
  options,
  maxLen,
  gridMs,
  hintLengthCtx,
) {
  const bossCtx = options.bossResolveContext ?? null;
  const spellCounts = options.spellCountsByLength ?? null;
  const shift = Math.max(0, Math.floor(Number(options.lengthWeightShift) || 0));

  let exactPool = applyBossHintLengthWeights(
    buildExactLengthWeights(shift),
    bossCtx,
    spellCounts,
    hintLengthCtx,
  );
  if (!exactPool.length) {
    exactPool = buildExactLengthWeights(shift);
  }
  let includeOther = true;

  const pickOptsBase = {
    bossResolveContext: bossCtx,
    anchorCell: options.ceruleanAnchorCell ?? null,
    requiredStartLetter:
      bossCtx?.slug === "cerulean_bell" && options.ceruleanAnchorCell
        ? hintWordStartLetterFromCell(options.ceruleanAnchorCell)
        : "",
    getHintLexicalTierForWord: options.getHintLexicalTierForWord,
    getHintLexicalPickWeight: options.getHintLexicalPickWeight,
    getHintWordIsFallbackOnly: options.getHintWordIsFallbackOnly,
  };

  for (let attempt = 0; attempt < MAX_LENGTH_RETRIES; attempt += 1) {
    const entries = buildActiveWeightEntries(exactPool, includeOther);
    const L = sampleTargetLength(entries, maxLen, rng);
    if (L == null) break;

    const pick = pickRandomWordAtLength(
      cells,
      L,
      gridMs,
      getCandidatesByLength,
      resolveWordPattern,
      rng,
      DEFAULT_MAX_CHECKS_PER_LENGTH,
      pickOptsBase,
    );
    if (pick) return pick;

    if (L >= OTHER_LENGTH_MIN) {
      includeOther = false;
    } else {
      exactPool = exactPool.filter((e) => e.len !== L);
    }
  }

  if (bossCtx?.slug === "the_needle") {
    for (let L = Math.min(maxLen, MAX_WORD_LEN); L >= MIN_WORD_LEN; L -= 1) {
      const pick = pickRandomWordAtLength(
        cells,
        L,
        gridMs,
        getCandidatesByLength,
        resolveWordPattern,
        rng,
        DEFAULT_MAX_CHECKS_PER_LENGTH,
        pickOptsBase,
      );
      if (pick) return pick;
    }
  }

  return null;
}

/**
 * @param {GridCell[]} cells
 * @param {(len: number) => string[] | undefined} getCandidatesByLength
 * @param {(pattern: string, wc?: string) => string | null} resolveWordPattern
 * @param {() => number} [rng]
 * @param {PickHintWordOptions} [options]
 * @returns {WordPick | null}
 */
export function pickHintWordForGrid(
  cells,
  getCandidatesByLength,
  resolveWordPattern,
  rng = Math.random,
  options = {},
) {
  const available = cells.filter((c) => c?.letter && !c.blocked);
  if (available.length < MIN_WORD_LEN) return null;

  const gridMs = pickedLetterMultiset(available);
  const maxLen = Math.min(MAX_WORD_LEN, available.length);
  /** @type {HintLengthContext} */
  const hintLengthCtx = {
    getJudgedLengthTableLen: options.getJudgedLengthTableLen,
    lengthLevelsByLength: options.lengthLevelsByLength,
    maxActualLen: maxLen,
  };

  const bossCtx = enrichBossResolveContextForHint(options.bossResolveContext ?? null, options);
  return pickHintWordWithLengthPool(
    available,
    getCandidatesByLength,
    resolveWordPattern,
    rng,
    { ...options, bossResolveContext: bossCtx },
    maxLen,
    gridMs,
    hintLengthCtx,
  );
}
