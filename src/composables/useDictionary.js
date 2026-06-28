import { ref, shallowRef, computed } from "vue";
import {
  PROGRESS_AFTER_DECOMPRESS,
  SPLIT_CORE_PROGRESS_END,
  resolveDictionaryBundle,
  fetchDictionaryDefinitionsText,
} from "../dictionary/dictionaryTransport.js";
import {
  buildDictionaryIndexesFromCoreText,
  mergeDictionaryDefinitions,
  splitPosFieldTokens,
} from "../dictionary/dictionaryIndexBuild.js";
import {
  getDictionaryIndexYieldEvery,
  yieldDuringDictionaryIndex,
} from "../dictionary/dictionaryLowEnd.js";
import { estimateLineCountFromText } from "../dictionary/dictionaryJsonlParse.js";
import { getAllowSpellingAbbreviations, getLetterQMode } from "../settings/gameSettings.js";
import {
  candidateMatchesWildcardPattern,
  countWildcardCharsInPattern,
  countWildcardSlotsForWord,
} from "../game/resolvedWordTileMapping.js";
import {
  getRarityForLetter,
  getRarityBonusForRarity,
  getRarityMultBonusForRarity,
} from "./useScoring.js";
import {
  bossHasWholeWordSoftRule,
  bossWildcardComplianceMode,
  buildBossWildcardResolveCacheKey,
  candidatePassesBossSoftWordRule,
  dictionaryPosMatchesClubKey,
} from "../game/bossWordViolation.js";
import { isBossEffectsSuppressedByTreasures } from "../game/treasureBossSuppress.js";
import {
  buildMouthSubstituteTriosForPattern,
  candidateMatchesMouthSubstitutePattern,
  hasTestTubeAllVowelsForMouth,
} from "../game/vowelNeighborSubstitute.js";
import {
  buildSlotIndexByLength,
  matchWordIdsForMouthPattern,
  matchWordIdsForPattern,
} from "../dictionary/dictionarySlotIndex.js";

/** 词典条目 [word, pos, translation_zh] → 小写 word 为 key 的 Map */
const wordSet = shallowRef(null);
const wordInfoMap = shallowRef(null);
/** 小写单词按长度分桶，便于 ? 通配符快速匹配 */
const wordsByLength = shallowRef(null);
/** 词长 → (槽位, 字母) 倒排索引 */
const slotIndexByLength = shallowRef(/** @type {Map<number, import("../dictionary/dictionarySlotIndex.js").LengthSlotIndex> | null} */ (null));
/** 小写词 → 词性 token 集（pos 字段按 | 拆分，与 build_word_filtered_csv 一致） */
const posTagsByWord = shallowRef(/** @type {Map<string, Set<string>> | null} */ (null));
/** 关闭「允许拼写缩写」时需排除的纯 abbr 词（建索引时预计算） */
const abbrOnlyWordSet = shallowRef(/** @type {Set<string> | null} */ (null));

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

let defsLoadToken = 0;

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

function commitDictionaryIndexes(indexes) {
  clearResolvePatternCache();
  wordSet.value = indexes.set;
  wordInfoMap.value = indexes.map;
  wordsByLength.value = indexes.byLength;
  slotIndexByLength.value = buildSlotIndexByLength(indexes.byLength);
  posTagsByWord.value = indexes.posTagsLocal;
  abbrOnlyWordSet.value = buildAbbrOnlyWordSet(indexes.posTagsLocal);
  dictLoaded.value = true;
  warmAllPureWildcardTables(null);
}

/** @param {Map<string, Set<string>> | null | undefined} posTagsMap */
function buildAbbrOnlyWordSet(posTagsMap) {
  if (!(posTagsMap instanceof Map)) return null;
  /** @type {Set<string>} */
  const only = new Set();
  for (const [w, tags] of posTagsMap) {
    if (!tags?.has("abbr")) continue;
    let hasNormal = false;
    for (const token of tags) {
      if (NORMAL_POS_TOKENS.has(token)) {
        hasNormal = true;
        break;
      }
    }
    if (!hasNormal) only.add(w);
  }
  return only;
}

/**
 * @param {Map<string, { word: string, pos: string, translation_zh: string }>} map
 * @param {string} defsUrl
 * @param {import("../dictionary/dictionaryTransport.js").DictionaryMeta | null | undefined} defsMeta
 * @param {boolean} defsCompressed
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
function scheduleDictionaryDefinitionsLoad(map, defsUrl, defsMeta, defsCompressed, options = {}) {
  const token = ++defsLoadToken;
  void (async () => {
    try {
      const defsText = await fetchDictionaryDefinitionsText(defsUrl, defsMeta, {
        ...options,
        compressed: defsCompressed,
      });
      if (token !== defsLoadToken || options.shouldAbort?.()) return;
      await mergeDictionaryDefinitions(map, defsText, options);
    } catch {
      // 释义为增强项：失败不影响拼词校验
    }
  })();
}

/**
 * @param {string} text
 * @param {{ shouldAbort?: () => boolean }} options
 */
async function buildLegacyDictionaryIndexes(text, options) {
  const { shouldAbort } = options;
  await raf();
  bumpLoadProgress(PROGRESS_AFTER_DECOMPRESS + 0.04);

  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("词典格式错误");

  if (shouldAbort?.()) return null;
  bumpLoadProgress(PROGRESS_AFTER_JSON);

  const set = new Set();
  const map = new Map();
  const byLength = new Map();
  /** @type {Map<string, Set<string>>} */
  const posTagsLocal = new Map();
  const n = raw.length;
  const yieldEvery = getDictionaryIndexYieldEvery(n);
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

    if (i % yieldEvery === 0) {
      bumpLoadProgress(PROGRESS_AFTER_JSON + (i / Math.max(1, n)) * indexSpan);
      if (shouldAbort?.()) return null;
      await yieldDuringDictionaryIndex();
    }
  }

  return { set, map, byLength, posTagsLocal };
}

/**
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
async function loadOnce(options = {}) {
  const { shouldAbort } = options;
  const dictBaseUrl = `${import.meta.env.BASE_URL}data/dictionary/`.replace(/\/+/g, "/");

  const bundle = await resolveDictionaryBundle(dictBaseUrl, {
    shouldAbort,
    bumpLoadProgress,
  });
  if (shouldAbort?.()) return;

  if (bundle.mode === "split") {
    await raf();
    bumpLoadProgress(SPLIT_CORE_PROGRESS_END + 0.02);

    const indexSpan = PROGRESS_BEFORE_DONE - SPLIT_CORE_PROGRESS_END - 0.02;
    const indexes = await buildDictionaryIndexesFromCoreText(bundle.coreText, {
      shouldAbort,
      estimatedRows: estimateLineCountFromText(bundle.coreText),
      onProgress: (ratio) => {
        bumpLoadProgress(SPLIT_CORE_PROGRESS_END + 0.02 + ratio * indexSpan);
      },
    });
    if (!indexes || shouldAbort?.()) return;

    commitDictionaryIndexes(indexes);
    bumpLoadProgress(1);
    scheduleDictionaryDefinitionsLoad(
      indexes.map,
      bundle.defsUrl,
      bundle.defsMeta,
      bundle.defsCompressed,
      options,
    );
    return;
  }

  bumpLoadProgress(PROGRESS_AFTER_DECOMPRESS);
  const indexes = await buildLegacyDictionaryIndexes(bundle.text, options);
  if (!indexes || shouldAbort?.()) return;

  commitDictionaryIndexes(indexes);
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
  const onlyAbbr = abbrOnlyWordSet.value;
  if (!(onlyAbbr instanceof Set)) return true;
  return !onlyAbbr.has(w);
}

/** 通配符解析 LRU 缓存（pattern + 稀有度等级 → 结果） */
const RESOLVE_PATTERN_CACHE_MAX = 128;
/** @type {Map<string, string | null>} */
const resolvePatternCache = new Map();
/** 嘴邻位 + 通配符统一解析 LRU */
/** @type {Map<string, string | null>} */
const mouthResolvePatternCache = new Map();
/** 纯 `?` 串、无 Boss：稀有度档位 → 词长 → 最优词 */
/** @type {Map<string, Map<number, string | null>>} */
const pureWildcardBestByLengthTables = new Map();
/** 棘梅 Boss：稀有度档位 + 词性 → 词长 → 最优词 */
/** @type {Map<string, Map<number, string | null>>} */
const pureWildcardClubBestByLengthTables = new Map();
/** 末贵 Boss：稀有度档位 → 词长 → 最优词（末字母非普通） */
/** @type {Map<string, Map<number, string | null>>} */
const pureWildcardNobleEndBestByLengthTables = new Map();

const PURE_WILDCARD_CLUB_KEYS = Object.freeze(["n", "v", "adj"]);

/** @param {Record<string, number> | null | undefined} rarityLevelsByRarity */
function buildRarityLevelsKey(rarityLevelsByRarity) {
  if (!rarityLevelsByRarity || typeof rarityLevelsByRarity !== "object") return "1|1|1|1";
  return `${rarityLevelsByRarity.common ?? 1}|${rarityLevelsByRarity.rare ?? 1}|${rarityLevelsByRarity.epic ?? 1}|${rarityLevelsByRarity.legendary ?? 1}`;
}

function clearResolvePatternCache() {
  resolvePatternCache.clear();
  mouthResolvePatternCache.clear();
  pureWildcardBestByLengthTables.clear();
  pureWildcardClubBestByLengthTables.clear();
  pureWildcardNobleEndBestByLengthTables.clear();
}

/** 设置切换 Q/Qu 或词典相关选项后，丢弃万能解析预计算表。 */
export function invalidateWildcardResolveCaches() {
  clearResolvePatternCache();
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
  if (getLetterQMode() === "qu") {
    let pi = 0;
    let ci = 0;
    while (pi < pattern.length && ci < candidate.length) {
      if (pattern[pi] !== wildcardChar) {
        pi += 1;
        ci += 1;
        continue;
      }
      const code = candidate.charCodeAt(ci);
      productSum += letterProductByCharCode[code] ?? 0;
      scoreSum += letterScoreByCharCode[code] ?? 0;
      if (candidate[ci] === "q" && candidate[ci + 1] === "u") {
        pi += 1;
        ci += 2;
      } else {
        pi += 1;
        ci += 1;
      }
    }
    return { productSum, scoreSum };
  }
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
 * @param {string} candidate
 * @param {Float64Array} letterProductByCharCode
 * @param {Float64Array} letterScoreByCharCode
 * @returns {{ productSum: number, scoreSum: number }}
 */
function scoreAllLettersIntrinsicProductSum(candidate, letterProductByCharCode, letterScoreByCharCode) {
  let productSum = 0;
  let scoreSum = 0;
  for (let i = 0; i < candidate.length; i += 1) {
    const code = candidate.charCodeAt(i);
    productSum += letterProductByCharCode[code] ?? 0;
    scoreSum += letterScoreByCharCode[code] ?? 0;
  }
  return { productSum, scoreSum };
}

/** @param {string} raw @param {string} wildcardChar */
function isAllWildcardPattern(raw, wildcardChar) {
  if (!raw.length) return false;
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] !== wildcardChar) return false;
  }
  return true;
}

/** @param {string} raw @param {boolean[]} vowelAltMask @param {string} wildcardChar */
function mouthPatternHasSubstitutableFixedPositions(raw, vowelAltMask, wildcardChar) {
  const len = Math.min(raw.length, vowelAltMask.length);
  for (let i = 0; i < len; i += 1) {
    if (raw[i] !== wildcardChar && vowelAltMask[i]) return true;
  }
  return false;
}

/** @param {Record<string, number> | null | undefined} rarityLevelsByRarity */
function buildPureWildcardTableKey(rarityLevelsByRarity) {
  const rarityKey = buildRarityLevelsKey(rarityLevelsByRarity);
  const abbrevKey = getAllowSpellingAbbreviations() ? "1" : "0";
  return `${rarityKey}\0${abbrevKey}\0${getLetterQMode()}`;
}

/** @param {Record<string, number> | null | undefined} rarityLevelsByRarity @returns {Map<number, string | null>} */
function ensurePureWildcardTable(rarityLevelsByRarity) {
  buildAllPureWildcardTables(rarityLevelsByRarity);
  return pureWildcardBestByLengthTables.get(buildPureWildcardTableKey(rarityLevelsByRarity)) ?? new Map();
}

/** @param {Record<string, number> | null | undefined} rarityLevelsByRarity */
function buildAllPureWildcardTables(rarityLevelsByRarity) {
  const baseKey = buildPureWildcardTableKey(rarityLevelsByRarity);
  if (pureWildcardBestByLengthTables.has(baseKey)) return;

  const byLength = wordsByLength.value;
  const infoMap = wordInfoMap.value;
  /** @type {Map<number, string | null>} */
  const anyTable = new Map();
  /** @type {Map<number, string | null>} */
  const nobleTable = new Map();
  /** @type {Map<string, Map<number, string | null>>} */
  const clubTables = new Map();
  for (const clubKey of PURE_WILDCARD_CLUB_KEYS) {
    clubTables.set(clubKey, new Map());
  }

  if (byLength instanceof Map) {
    const { letterProductByCharCode, letterScoreByCharCode } = getLetterIntrinsicTables(rarityLevelsByRarity);
    for (const [len, candidates] of byLength) {
      if (!Array.isArray(candidates) || candidates.length === 0) {
        if (getLetterQMode() !== "qu") {
          anyTable.set(len, null);
          nobleTable.set(len, null);
          for (const clubTable of clubTables.values()) clubTable.set(len, null);
        }
        continue;
      }

      for (const candidate of candidates) {
        if (!isWordAllowedByAbbrevSetting(candidate)) continue;
        const metrics = scoreAllLettersIntrinsicProductSum(
          candidate,
          letterProductByCharCode,
          letterScoreByCharCode,
        );
        const bucketKey =
          getLetterQMode() === "qu" ? countWildcardSlotsForWord(candidate, "qu") : len;
        if (bucketKey < 1) continue;

        /** @param {Map<number, string | null>} table */
        const tryUpdate = (table, prevBest) => {
          const prevMetrics =
            prevBest != null
              ? scoreAllLettersIntrinsicProductSum(prevBest, letterProductByCharCode, letterScoreByCharCode)
              : { productSum: -1, scoreSum: -1 };
          if (prevBest === null || isWildcardCandidateBetter(metrics, prevMetrics, candidate, prevBest)) {
            table.set(bucketKey, candidate);
          }
        };

        tryUpdate(anyTable, anyTable.get(bucketKey) ?? null);

        const endCh = candidate.charAt(candidate.length - 1);
        if (getRarityForLetter(endCh) !== "common") {
          tryUpdate(nobleTable, nobleTable.get(bucketKey) ?? null);
        }

        if (infoMap instanceof Map) {
          const def = infoMap.get(candidate);
          for (const clubKey of PURE_WILDCARD_CLUB_KEYS) {
            if (!dictionaryPosMatchesClubKey(def?.pos, clubKey, def?.translation_zh)) continue;
            const clubTable = clubTables.get(clubKey);
            if (!clubTable) continue;
            tryUpdate(clubTable, clubTable.get(bucketKey) ?? null);
          }
        }
      }
    }
  }

  pureWildcardBestByLengthTables.set(baseKey, anyTable);
  pureWildcardNobleEndBestByLengthTables.set(`${baseKey}\0noble_end`, nobleTable);
  for (const clubKey of PURE_WILDCARD_CLUB_KEYS) {
    pureWildcardClubBestByLengthTables.set(`${baseKey}\0club\0${clubKey}`, clubTables.get(clubKey) ?? new Map());
  }
}

/**
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 * @param {string} clubKey `n` | `v` | `adj`
 * @returns {Map<number, string | null>}
 */
function ensurePureWildcardClubTable(rarityLevelsByRarity, clubKey) {
  buildAllPureWildcardTables(rarityLevelsByRarity);
  const key = String(clubKey ?? "").trim();
  return (
    pureWildcardClubBestByLengthTables.get(`${buildPureWildcardTableKey(rarityLevelsByRarity)}\0club\0${key}`) ??
    new Map()
  );
}

/** @param {Record<string, number> | null | undefined} rarityLevelsByRarity @returns {Map<number, string | null>} */
function ensurePureWildcardNobleEndTable(rarityLevelsByRarity) {
  buildAllPureWildcardTables(rarityLevelsByRarity);
  return (
    pureWildcardNobleEndBestByLengthTables.get(`${buildPureWildcardTableKey(rarityLevelsByRarity)}\0noble_end`) ??
    new Map()
  );
}

/** @param {Record<string, number> | null | undefined} [rarityLevelsByRarity] */
function warmAllPureWildcardTables(rarityLevelsByRarity = null) {
  buildAllPureWildcardTables(rarityLevelsByRarity);
}

/**
 * @param {number} wordLen
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext} bossResolveContext
 */
function resolvePureWildcardJudgedLen(wordLen, bossResolveContext) {
  if (typeof bossResolveContext.getJudgedWordLen === "function") {
    return bossResolveContext.getJudgedWordLen("a".repeat(wordLen));
  }
  return wordLen;
}

/**
 * 纯 `?` + Boss 软规则：长度类 Boss 直接判定，棘梅/末贵查预计算表。
 * @param {number} wordLen
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext} bossResolveContext
 * @returns {string | null}
 */
function resolvePureWildcardWithBossTier(wordLen, rarityLevelsByRarity, bossResolveContext) {
  const bestAnyTable = ensurePureWildcardTable(rarityLevelsByRarity);
  const bestAny = bestAnyTable.get(wordLen) ?? null;
  const slug = String(bossResolveContext.slug ?? "");
  const judgedLen = resolvePureWildcardJudgedLen(wordLen, bossResolveContext);

  /** @type {string | null} */
  let bestBoss = bestAny;

  if (slug === "the_psychic") {
    bestBoss = judgedLen === 5 ? bestAny : null;
  } else if (slug === "the_eye") {
    const used = bossResolveContext.usedLengthsThisLevel;
    bestBoss = used instanceof Set && used.has(judgedLen) ? null : bestAny;
  } else if (slug === "the_mouth") {
    const locked = bossResolveContext.mouthLockedLength;
    bestBoss =
      locked != null && Number.isFinite(locked) && judgedLen !== locked ? null : bestAny;
  } else if (slug === "the_club") {
    const clubKey = String(bossResolveContext.clubRequiredKey ?? "").trim();
    bestBoss = clubKey
      ? (ensurePureWildcardClubTable(rarityLevelsByRarity, clubKey).get(wordLen) ?? null)
      : bestAny;
  } else if (slug === "the_noble_end") {
    bestBoss = ensurePureWildcardNobleEndTable(rarityLevelsByRarity).get(wordLen) ?? null;
  }

  return bestBoss ?? bestAny;
}

/**
 * 纯 `?` pattern：各万能位取稀有度内在分×倍率之和最大者；Boss 软规则亦查表 O(1)。
 * @param {number} len
 * @param {string} wildcardChar
 * @param {Record<string, number> | null | undefined} [rarityLevelsByRarity]
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext | null | undefined} [bossResolveContext]
 * @returns {string | null}
 */
function resolvePureWildcardWord(len, wildcardChar, rarityLevelsByRarity = null, bossResolveContext = null) {
  const wordLen = Math.max(0, Math.floor(Number(len)));
  if (wordLen < 1) return null;

  const useBossTier =
    bossResolveContext &&
    bossHasWholeWordSoftRule(bossResolveContext.slug) &&
    !isBossEffectsSuppressedByTreasures(bossResolveContext.ownedSlotTreasureIds);

  if (!useBossTier) {
    return ensurePureWildcardTable(rarityLevelsByRarity).get(wordLen) ?? null;
  }

  return resolvePureWildcardWithBossTier(wordLen, rarityLevelsByRarity, bossResolveContext);
}

/**
 * 在 slot 交集得到的 wordId 集合上择优（Boss 合规优先）。
 * @param {import("../dictionary/dictionarySlotIndex.js").LengthSlotIndex} lengthIndex
 * @param {Uint32Array} wordIds
 * @param {string} raw
 * @param {string} wildcardChar
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext | null | undefined} bossResolveContext
 * @returns {string | null}
 */
function pickBestWildcardFromWordIds(
  lengthIndex,
  wordIds,
  raw,
  wildcardChar,
  rarityLevelsByRarity,
  bossResolveContext,
) {
  if (!wordIds.length) return null;

  const { letterProductByCharCode, letterScoreByCharCode } = getLetterIntrinsicTables(rarityLevelsByRarity);
  const useBossTier =
    bossResolveContext &&
    bossHasWholeWordSoftRule(bossResolveContext.slug) &&
    !isBossEffectsSuppressedByTreasures(bossResolveContext.ownedSlotTreasureIds);
  const bossMode = useBossTier ? bossWildcardComplianceMode(bossResolveContext, raw.length) : "all_pass";
  const checkBossPerCandidate = bossMode === "per_candidate";

  let bestBoss = null;
  let bestBossMetrics = { productSum: -1, scoreSum: -1 };
  let bestAny = null;
  let bestAnyMetrics = { productSum: -1, scoreSum: -1 };

  for (let k = 0; k < wordIds.length; k += 1) {
    const candidate = lengthIndex.words[wordIds[k]];
    if (!candidate || !isWordAllowedByAbbrevSetting(candidate)) continue;
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
      checkBossPerCandidate &&
      candidatePassesBossSoftWordRule(candidate, bossResolveContext) &&
      (bestBoss === null || isWildcardCandidateBetter(metrics, bestBossMetrics, candidate, bestBoss))
    ) {
      bestBoss = candidate;
      bestBossMetrics = metrics;
    }
  }

  if (bossMode === "all_pass") return bestAny;
  if (bossMode === "all_fail") return bestAny;
  return bestBoss ?? bestAny;
}

/**
 * 线性扫描回退（slot 索引不可用时）。
 * @param {string[]} candidates
 * @param {string} raw
 * @param {string} wildcardChar
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext | null | undefined} bossResolveContext
 * @param {(candidate: string) => boolean} [matchesPattern]
 * @returns {string | null}
 */
function pickBestWildcardFromCandidatesLinear(
  candidates,
  raw,
  wildcardChar,
  rarityLevelsByRarity,
  bossResolveContext,
  matchesPattern,
) {
  const { letterProductByCharCode, letterScoreByCharCode } = getLetterIntrinsicTables(rarityLevelsByRarity);
  const useBossTier =
    bossResolveContext &&
    bossHasWholeWordSoftRule(bossResolveContext.slug) &&
    !isBossEffectsSuppressedByTreasures(bossResolveContext.ownedSlotTreasureIds);
  const bossMode = useBossTier ? bossWildcardComplianceMode(bossResolveContext, raw.length) : "all_pass";
  const checkBossPerCandidate = bossMode === "per_candidate";

  let bestBoss = null;
  let bestBossMetrics = { productSum: -1, scoreSum: -1 };
  let bestAny = null;
  let bestAnyMetrics = { productSum: -1, scoreSum: -1 };

  outer: for (const candidate of candidates) {
    if (matchesPattern && !matchesPattern(candidate)) continue;
    if (!matchesPattern) {
      if (getLetterQMode() === "qu") {
        if (!candidateMatchesWildcardPattern(raw, candidate, wildcardChar, "qu")) continue;
      } else {
        for (let i = 0; i < raw.length; i += 1) {
          const ch = raw[i];
          if (ch !== wildcardChar && ch !== candidate[i]) continue outer;
        }
      }
    }
    if (!isWordAllowedByAbbrevSetting(candidate)) continue;
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
      checkBossPerCandidate &&
      candidatePassesBossSoftWordRule(candidate, bossResolveContext) &&
      (bestBoss === null || isWildcardCandidateBetter(metrics, bestBossMetrics, candidate, bestBoss))
    ) {
      bestBoss = candidate;
      bestBossMetrics = metrics;
    }
  }

  if (bossMode === "all_pass") return bestAny;
  if (bossMode === "all_fail") return bestAny;
  return bestBoss ?? bestAny;
}

/**
 * Qu 模式：收集 pattern 槽位可对齐的候选词（pattern 长 = 槽位数，候选词长可更长）。
 * @param {string} raw
 * @param {string} wildcardChar
 * @returns {string[]}
 */
function collectCandidatesForQuWildcardPattern(raw, wildcardChar) {
  /** @type {string[]} */
  const out = [];
  const byLength = wordsByLength.value;
  if (!(byLength instanceof Map)) return out;
  const minLen = raw.length;
  const maxLen = raw.length + countWildcardCharsInPattern(raw, wildcardChar);
  for (let len = minLen; len <= maxLen; len += 1) {
    const bucket = byLength.get(len);
    if (!Array.isArray(bucket)) continue;
    for (const w of bucket) {
      if (candidateMatchesWildcardPattern(raw, w, wildcardChar, "qu")) out.push(w);
    }
  }
  return out;
}

/**
 * @param {string} raw
 * @param {string} wildcardChar
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext | null | undefined} bossResolveContext
 * @returns {string | null}
 */
function resolveMixedWildcardPattern(raw, wildcardChar, rarityLevelsByRarity, bossResolveContext) {
  if (getLetterQMode() === "qu" && raw.includes(wildcardChar)) {
    if (isAllWildcardPattern(raw, wildcardChar)) {
      return resolvePureWildcardWord(raw.length, wildcardChar, rarityLevelsByRarity, bossResolveContext);
    }
    const candidates = collectCandidatesForQuWildcardPattern(raw, wildcardChar);
    return pickBestWildcardFromCandidatesLinear(
      candidates,
      raw,
      wildcardChar,
      rarityLevelsByRarity,
      bossResolveContext,
      (candidate) => candidateMatchesWildcardPattern(raw, candidate, wildcardChar, "qu"),
    );
  }

  const slotMaps = slotIndexByLength.value;
  const lengthIndex = slotMaps instanceof Map ? slotMaps.get(raw.length) : null;

  if (lengthIndex) {
    const wordIds = matchWordIdsForPattern(lengthIndex, raw, wildcardChar);
    return pickBestWildcardFromWordIds(
      lengthIndex,
      wordIds,
      raw,
      wildcardChar,
      rarityLevelsByRarity,
      bossResolveContext,
    );
  }

  const byLength = wordsByLength.value;
  const candidates = byLength instanceof Map ? byLength.get(raw.length) : null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return pickBestWildcardFromCandidatesLinear(
    candidates,
    raw,
    wildcardChar,
    rarityLevelsByRarity,
    bossResolveContext,
  );
}

/**
 * @param {string} raw
 * @param {boolean[]} vowelAltMask
 * @param {string} wildcardChar
 * @param {Record<string, number> | null | undefined} rarityLevelsByRarity
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext | null | undefined} bossResolveContext
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @returns {string | null}
 */
function resolveMixedMouthWildcardPattern(
  raw,
  vowelAltMask,
  wildcardChar,
  rarityLevelsByRarity,
  bossResolveContext,
  ownedSlotTreasureIds,
) {
  const mouthTrios = buildMouthSubstituteTriosForPattern(
    raw,
    vowelAltMask,
    wildcardChar,
    ownedSlotTreasureIds,
  );
  const slotMaps = slotIndexByLength.value;
  const lengthIndex = slotMaps instanceof Map ? slotMaps.get(raw.length) : null;

  if (lengthIndex) {
    const wordIds = matchWordIdsForMouthPattern(lengthIndex, raw, mouthTrios, wildcardChar);
    return pickBestWildcardFromWordIds(
      lengthIndex,
      wordIds,
      raw,
      wildcardChar,
      rarityLevelsByRarity,
      bossResolveContext,
    );
  }

  const byLength = wordsByLength.value;
  const candidates = byLength instanceof Map ? byLength.get(raw.length) : null;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  return pickBestWildcardFromCandidatesLinear(
    candidates,
    raw,
    wildcardChar,
    rarityLevelsByRarity,
    bossResolveContext,
    (candidate) => candidateMatchesMouthSubstitutePattern(raw, candidate, mouthTrios, wildcardChar),
  );
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
  if (isAllWildcardPattern(raw, wildcardChar)) {
    return resolvePureWildcardWord(raw.length, wildcardChar, rarityLevelsByRarity, bossResolveContext);
  }

  const rarityKey = buildRarityLevelsKey(rarityLevelsByRarity);
  const bossKey = buildBossWildcardResolveCacheKey(bossResolveContext);
  const cacheKey = `${raw}\0${wildcardChar}\0${rarityKey}\0${bossKey}\0${getLetterQMode()}`;
  if (resolvePatternCache.has(cacheKey)) return resolvePatternCache.get(cacheKey) ?? null;

  const best = resolveMixedWildcardPattern(raw, wildcardChar, rarityLevelsByRarity, bossResolveContext);
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

/** @param {string} cacheKey @param {string | null} result */
function rememberMouthResolvePatternCache(cacheKey, result) {
  if (mouthResolvePatternCache.size >= RESOLVE_PATTERN_CACHE_MAX) {
    const first = mouthResolvePatternCache.keys().next().value;
    if (first !== undefined) mouthResolvePatternCache.delete(first);
  }
  mouthResolvePatternCache.set(cacheKey, result);
}

/**
 * 嘴邻位 + 通配符统一解析：单次扫同长度候选桶，避免 3^n × 全词典嵌套。
 * @param {string} pattern
 * @param {boolean[]} vowelAltMask 与 pattern 等长
 * @param {string} [wildcardChar]
 * @param {Record<string, number> | null | undefined} [rarityLevelsByRarity]
 * @param {import("../game/bossWordViolation.js").BossWildcardResolveContext | null | undefined} [bossResolveContext]
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 * @returns {string | null}
 */
export function resolveWordPatternWithMouthSubstitutions(
  pattern,
  vowelAltMask,
  wildcardChar = "?",
  rarityLevelsByRarity = null,
  bossResolveContext = null,
  ownedSlotTreasureIds = [],
) {
  const raw = String(pattern ?? "").toLowerCase().trim();
  if (!raw || !vowelAltMask?.length) {
    return resolveWordPattern(raw, wildcardChar, rarityLevelsByRarity, bossResolveContext);
  }
  const set = wordSet.value;
  if (!(set instanceof Set)) return null;

  if (
    isAllWildcardPattern(raw, wildcardChar) ||
    !mouthPatternHasSubstitutableFixedPositions(raw, vowelAltMask, wildcardChar)
  ) {
    return resolveWordPattern(raw, wildcardChar, rarityLevelsByRarity, bossResolveContext);
  }

  const maskBits = vowelAltMask.map((b) => (b ? "1" : "0")).join("");
  const tubeFlag = hasTestTubeAllVowelsForMouth(ownedSlotTreasureIds) ? "1" : "0";
  const rarityKey = buildRarityLevelsKey(rarityLevelsByRarity);
  const bossKey = buildBossWildcardResolveCacheKey(bossResolveContext);
  const cacheKey = `mouth\0${raw}\0${maskBits}\0${tubeFlag}\0${wildcardChar}\0${rarityKey}\0${bossKey}\0${getLetterQMode()}`;
  if (mouthResolvePatternCache.has(cacheKey)) return mouthResolvePatternCache.get(cacheKey) ?? null;

  const best = resolveMixedMouthWildcardPattern(
    raw,
    vowelAltMask,
    wildcardChar,
    rarityLevelsByRarity,
    bossResolveContext,
    ownedSlotTreasureIds,
  );
  rememberMouthResolvePatternCache(cacheKey, best);
  return best;
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
        const rawMsg = String(e?.message ?? e ?? "");
        if (/memory|allocation|heap|out of memory|invalid string length/i.test(rawMsg)) {
          dictError.value = "设备内存不足，请关闭其它应用后重试";
        } else {
          dictError.value = rawMsg || "词典加载失败";
        }
        clearResolvePatternCache();
        wordSet.value = null;
        wordInfoMap.value = null;
        wordsByLength.value = null;
        slotIndexByLength.value = null;
        posTagsByWord.value = null;
        abbrOnlyWordSet.value = null;
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
    resolveWordPatternWithMouthSubstitutions,
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
