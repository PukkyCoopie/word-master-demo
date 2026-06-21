import { ref, shallowRef, computed } from "vue";
import {
  PROGRESS_AFTER_DECOMPRESS,
  resolveDictionaryText,
} from "../dictionary/dictionaryTransport.js";
import { getAllowSpellingAbbreviations } from "../settings/gameSettings.js";
import {
  getRarityForLetter,
  getRarityBonusForRarity,
  getRarityMultBonusForRarity,
} from "./useScoring.js";
import {
  bossHasWholeWordSoftRule,
  buildBossWildcardResolveCacheKey,
  candidatePassesBossSoftWordRule,
} from "../game/bossWordViolation.js";
import { isBossEffectsSuppressedByTreasures } from "../game/treasureBossSuppress.js";

/** 词典条目 [word, pos, translation_zh] → 小写 word 为 key 的 Map */
const wordSet = shallowRef(null);
const wordInfoMap = shallowRef(null);
/** 小写单词按长度分桶，便于 ? 通配符快速匹配 */
const wordsByLength = shallowRef(null);
/** 小写词 → 词性 token 集（pos 字段按 | 拆分，与 build_word_filtered_csv 一致） */
const posTagsByWord = shallowRef(/** @type {Map<string, Set<string>> | null} */ (null));

/** 视为「正常词性」的 token；含 abbr 但同时含其一则关闭缩写开关时仍可拼写 */
const NORMAL_POS_TOKENS = new Set([
  "n",
  "v",
  "vi",
  "vt",
  "adj",
  "adv",
  "prep",
  "conj",
  "pron",
  "num",
  "art",
  "interj",
  "aux",
  "det",
  "a",
]);

/**
 * @param {string} posField
 * @returns {string[]}
 */
function splitPosFieldTokens(posField) {
  return String(posField ?? "")
    .trim()
    .toLowerCase()
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 全局共享：App 预加载与 GamePanel 共用 */
const dictLoaded = ref(false);
const dictLoading = ref(false);
const dictError = ref(null);
/** 0～1，下载与解析合并进度 */
const dictLoadProgress = ref(0);

let inFlightLoad = null;
/** 单次加载内单调递增，避免进度回跳 */
let loadProgressFloor = 0;

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function resetLoadProgress() {
  loadProgressFloor = 0;
  dictLoadProgress.value = 0;
}

function bumpLoadProgress(p) {
  const next = clamp01(p);
  if (next <= loadProgressFloor) return;
  loadProgressFloor = next;
  dictLoadProgress.value = next;
}

function raf() {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** JSON 解析与建索引阶段（下载/解压由 dictionaryTransport 负责） */
const PROGRESS_AFTER_JSON = 0.78;
const PROGRESS_BEFORE_DONE = 0.99;

/**
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
async function loadOnce(options = {}) {
  const { shouldAbort } = options;
  const dictBaseUrl = `${import.meta.env.BASE_URL}data/dictionary/`.replace(/\/+/g, "/");

  const text = await resolveDictionaryText(dictBaseUrl, {
    shouldAbort,
    bumpLoadProgress,
  });
  if (shouldAbort?.()) return;
  bumpLoadProgress(PROGRESS_AFTER_DECOMPRESS);

  await raf();
  bumpLoadProgress(PROGRESS_AFTER_DECOMPRESS + 0.04);

  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("词典格式错误");

  if (shouldAbort?.()) return;
  bumpLoadProgress(PROGRESS_AFTER_JSON);

  const set = new Set();
  const map = new Map();
  const byLength = new Map();
  /** @type {Map<string, Set<string>>} */
  const posTagsLocal = new Map();
  const n = raw.length;
  const chunk = Math.max(4000, Math.ceil(n / 96));
  const indexSpan = PROGRESS_BEFORE_DONE - PROGRESS_AFTER_JSON;

  for (let i = 0; i < n; i++) {
    const row = raw[i];
    const [word, pos, translation_zh] = row;
    if (!word || typeof word !== "string") continue;
    const w = word.toLowerCase();
    set.add(w);
    if (!map.has(w)) map.set(w, { word: w, pos, translation_zh });
    for (const token of splitPosFieldTokens(pos)) {
      if (!posTagsLocal.has(w)) posTagsLocal.set(w, new Set());
      posTagsLocal.get(w).add(token);
    }
    const len = w.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push(w);

    if (i % chunk === 0) {
      bumpLoadProgress(PROGRESS_AFTER_JSON + (i / Math.max(1, n)) * indexSpan);
      if (shouldAbort?.()) return;
      await raf();
    }
  }

  if (shouldAbort?.()) return;
  clearResolvePatternCache();
  wordSet.value = set;
  wordInfoMap.value = map;
  wordsByLength.value = byLength;
  posTagsByWord.value = posTagsLocal;
  dictLoaded.value = true;
  bumpLoadProgress(1);
}

/**
 * 关闭「允许拼写缩写」时：仅屏蔽词性里**只有** abbr、没有正常词性的词；
 * 同时带 abbr 与 n/v/adj 等的词仍可拼写。
 * @param {string} word
 */
function isWordAllowedByAbbrevSetting(word) {
  const w = String(word).toLowerCase().trim();
  if (!w) return false;
  if (getAllowSpellingAbbreviations()) return true;
  const tagsMap = posTagsByWord.value;
  if (!(tagsMap instanceof Map)) return true;
  const tags = tagsMap.get(w);
  if (!tags || !tags.has("abbr")) return true;
  for (const token of tags) {
    if (NORMAL_POS_TOKENS.has(token)) return true;
  }
  return false;
}

/** 通配符解析 LRU 缓存（pattern + 稀有度等级 → 结果） */
const RESOLVE_PATTERN_CACHE_MAX = 128;
/** @type {Map<string, string | null>} */
const resolvePatternCache = new Map();

/** @param {Record<string, number> | null | undefined} rarityLevelsByRarity */
function buildRarityLevelsKey(rarityLevelsByRarity) {
  if (!rarityLevelsByRarity || typeof rarityLevelsByRarity !== "object") return "1|1|1|1";
  return `${rarityLevelsByRarity.common ?? 1}|${rarityLevelsByRarity.rare ?? 1}|${rarityLevelsByRarity.epic ?? 1}|${rarityLevelsByRarity.legendary ?? 1}`;
}

function clearResolvePatternCache() {
  resolvePatternCache.clear();
}

let letterIntrinsicTablesKey = "";
/** @type {Float64Array | null} */
let letterProductByCharCode = null;
/** @type {Float64Array | null} */
let letterScoreByCharCode = null;

/** @param {Record<string, number> | null | undefined} rarityLevelsByRarity */
function getLetterIntrinsicTables(rarityLevelsByRarity) {
  const key = buildRarityLevelsKey(rarityLevelsByRarity);
  if (key === letterIntrinsicTablesKey && letterProductByCharCode && letterScoreByCharCode) {
    return { letterProductByCharCode, letterScoreByCharCode };
  }
  const products = new Float64Array(128);
  const scores = new Float64Array(128);
  for (let code = 97; code <= 122; code += 1) {
    const ch = String.fromCharCode(code);
    const rarity = getRarityForLetter(ch);
    const score = getRarityBonusForRarity(rarity, rarityLevelsByRarity);
    const mult = getRarityMultBonusForRarity(rarity, rarityLevelsByRarity);
    products[code] = score * mult;
    scores[code] = score;
  }
  letterIntrinsicTablesKey = key;
  letterProductByCharCode = products;
  letterScoreByCharCode = scores;
  return { letterProductByCharCode, letterScoreByCharCode };
}

/**
 * 各万能位：稀有度奖励分 × 稀有度倍率（含局内升级；不含宝藏/材质/格上角标）。
 * @param {string} pattern
 * @param {string} candidate
 * @param {string} wildcardChar
 * @param {Float64Array} letterProductByCharCode
 * @param {Float64Array} letterScoreByCharCode
 * @returns {{ productSum: number, scoreSum: number }}
 */
function scoreWildcardIntrinsicProductSum(
  pattern,
  candidate,
  wildcardChar,
  letterProductByCharCode,
  letterScoreByCharCode,
) {
  let productSum = 0;
  let scoreSum = 0;
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] !== wildcardChar) continue;
    const code = candidate.charCodeAt(i);
    productSum += letterProductByCharCode[code] ?? 0;
    scoreSum += letterScoreByCharCode[code] ?? 0;
  }
  return { productSum, scoreSum };
}

/**
 * @param {{ productSum: number, scoreSum: number }} metrics
 * @param {{ productSum: number, scoreSum: number }} bestMetrics
 * @param {string} candidate
 * @param {string} best
 */
function isWildcardCandidateBetter(metrics, bestMetrics, candidate, best) {
  if (metrics.productSum !== bestMetrics.productSum) return metrics.productSum > bestMetrics.productSum;
  if (metrics.scoreSum !== bestMetrics.scoreSum) return metrics.scoreSum > bestMetrics.scoreSum;
  return candidate < best;
}

/**
 * 带通配符 `?` 的匹配：例如 `c?t` 可匹配 `cat` / `cut`。
 * 多个命中时：Boss 整词软规则合规词优先；其中取各万能位「稀有度奖励分×稀有度倍率（含升级）」之和最大者。
 * 若无合规词则回退至全体候选的稀有度最优。无命中返回 null。
 * @param {string} word
 * @param {string} [wildcardChar]
 * @param {Record<string, number> | null | undefined} [rarityLevelsByRarity]
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext | null | undefined} [bossResolveContext]
 * @returns {string | null}
 */
export function resolveWordPattern(
  word,
  wildcardChar = "?",
  rarityLevelsByRarity = null,
  bossResolveContext = null,
) {
  const raw = String(word).toLowerCase().trim();
  if (!raw) return null;
  const set = wordSet.value;
  if (!(set instanceof Set)) return null;
  if (!raw.includes(wildcardChar)) {
    return set.has(raw) && isWordAllowedByAbbrevSetting(raw) ? raw : null;
  }

  const rarityKey = buildRarityLevelsKey(rarityLevelsByRarity);
  const bossKey = buildBossWildcardResolveCacheKey(bossResolveContext);
  const cacheKey = `${raw}\0${wildcardChar}\0${rarityKey}\0${bossKey}`;
  if (resolvePatternCache.has(cacheKey)) return resolvePatternCache.get(cacheKey) ?? null;

  const byLength = wordsByLength.value;
  const candidates = byLength instanceof Map ? byLength.get(raw.length) : null;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    rememberResolvePatternCache(cacheKey, null);
    return null;
  }

  const { letterProductByCharCode, letterScoreByCharCode } = getLetterIntrinsicTables(rarityLevelsByRarity);
  let patternHasFixed = false;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] !== wildcardChar) {
      patternHasFixed = true;
      break;
    }
  }

  const useBossTier =
    bossResolveContext &&
    bossHasWholeWordSoftRule(bossResolveContext.slug) &&
    !isBossEffectsSuppressedByTreasures(bossResolveContext.ownedSlotTreasureIds);

  let bestBoss = null;
  let bestBossMetrics = { productSum: -1, scoreSum: -1 };
  let bestAny = null;
  let bestAnyMetrics = { productSum: -1, scoreSum: -1 };
  outer: for (const candidate of candidates) {
    if (!isWordAllowedByAbbrevSetting(candidate)) continue;
    if (patternHasFixed) {
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch !== wildcardChar && ch !== candidate[i]) continue outer;
      }
    }
    const metrics = scoreWildcardIntrinsicProductSum(
      raw,
      candidate,
      wildcardChar,
      letterProductByCharCode,
      letterScoreByCharCode,
    );
    if (bestAny === null || isWildcardCandidateBetter(metrics, bestAnyMetrics, candidate, bestAny)) {
      bestAny = candidate;
      bestAnyMetrics = metrics;
    }
    if (
      useBossTier &&
      candidatePassesBossSoftWordRule(candidate, bossResolveContext) &&
      (bestBoss === null || isWildcardCandidateBetter(metrics, bestBossMetrics, candidate, bestBoss))
    ) {
      bestBoss = candidate;
      bestBossMetrics = metrics;
    }
  }
  const best = bestBoss ?? bestAny;
  rememberResolvePatternCache(cacheKey, best);
  return best;
}

/** @param {string} cacheKey @param {string | null} result */
function rememberResolvePatternCache(cacheKey, result) {
  if (resolvePatternCache.size >= RESOLVE_PATTERN_CACHE_MAX) {
    const first = resolvePatternCache.keys().next().value;
    if (first !== undefined) resolvePatternCache.delete(first);
  }
  resolvePatternCache.set(cacheKey, result);
}

export function useDictionary() {
  /** 仅当正式词典加载成功后才可校验单词 */
  const dictionaryReady = computed(() => wordSet.value instanceof Set);

  /**
   * @param {{ shouldAbort?: () => boolean }} [options]
   */
  async function loadDictionary(options = {}) {
    const { shouldAbort } = options;
    if (wordSet.value) {
      dictLoaded.value = true;
      dictLoading.value = false;
      dictError.value = null;
      loadProgressFloor = 1;
      dictLoadProgress.value = 1;
      return;
    }
    if (inFlightLoad) return inFlightLoad;

    inFlightLoad = (async () => {
      dictLoading.value = true;
      dictError.value = null;
      resetLoadProgress();
      try {
        await loadOnce(options);
      } catch (e) {
        dictError.value = e?.message || "词典加载失败";
        clearResolvePatternCache();
        wordSet.value = null;
        wordInfoMap.value = null;
        wordsByLength.value = null;
        posTagsByWord.value = null;
        dictLoaded.value = false;
        resetLoadProgress();
      } finally {
        dictLoading.value = false;
      }
    })();

    try {
      await inFlightLoad;
    } finally {
      inFlightLoad = null;
    }
  }

  function isValidWord(word) {
    const w = String(word).toLowerCase().trim();
    if (!w) return false;
    const set = wordSet.value;
    if (!(set instanceof Set)) return false;
    return set.has(w) && isWordAllowedByAbbrevSetting(w);
  }

  /**
   * @param {string} word
   * @param {string} [wildcardChar]
   * @param {Record<string, number> | null | undefined} [rarityLevelsByRarity]
   */
  function isValidWordPattern(
    word,
    wildcardChar = "?",
    rarityLevelsByRarity = null,
    bossResolveContext = null,
  ) {
    return resolveWordPattern(word, wildcardChar, rarityLevelsByRarity, bossResolveContext) != null;
  }

  function getWordDefinition(word) {
    const w = String(word).toLowerCase().trim();
    if (wordInfoMap.value && wordInfoMap.value.has(w)) return wordInfoMap.value.get(w);
    return null;
  }

  /** E2E：按词长取候选词列表（只读） */
  function getCandidateWordsByLength(len) {
    const byLength = wordsByLength.value;
    if (!(byLength instanceof Map)) return [];
    const n = Math.max(0, Math.floor(Number(len)));
    return byLength.get(n) ?? [];
  }

  return {
    loaded: dictLoaded,
    loading: dictLoading,
    error: dictError,
    loadProgress: dictLoadProgress,
    dictionaryReady,
    loadDictionary,
    isValidWord,
    isValidWordPattern,
    resolveWordPattern,
    getWordDefinition,
    getCandidateWordsByLength,
  };
}

/** @param {number} len */
export function getCandidateWordsByLength(len) {
  const byLength = wordsByLength.value;
  if (!(byLength instanceof Map)) return [];
  const n = Math.max(0, Math.floor(Number(len)));
  return byLength.get(n) ?? [];
}

export function getWordDefinition(word) {
  const w = String(word).toLowerCase().trim();
  if (wordInfoMap.value && wordInfoMap.value.has(w)) return wordInfoMap.value.get(w);
  return null;
}

/** 词性仅含 abbr、无正常词性（寻呼机测验等用） */
export function isAbbrevOnlyWord(word) {
  const w = String(word).toLowerCase().trim();
  if (!w) return false;
  const tagsMap = posTagsByWord.value;
  if (!(tagsMap instanceof Map)) return false;
  const tags = tagsMap.get(w);
  if (!tags || !tags.has("abbr")) return false;
  for (const token of tags) {
    if (NORMAL_POS_TOKENS.has(token)) return false;
  }
  return true;
}

export function getDictionaryWordCount() {
  const set = wordSet.value;
  return set instanceof Set ? set.size : 0;
}
