import { ref, shallowRef, computed } from "vue";
import { getAllowSpellingAbbreviations } from "../settings/gameSettings.js";

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

/**
 * 推断解压后体积：Content-Length 在 gzip/br 下多为压缩大小，不可直接当 fetch 累计字节的分母。
 * @param {Response} res
 */
function estimateDecompressedBytes(res) {
  const enc = (res.headers.get("Content-Encoding") || "").toLowerCase();
  const cl = Number(res.headers.get("Content-Length") || 0) || 0;
  if (cl <= 0) return 0;
  if (!enc) return cl;
  return Math.round(cl * 4);
}

/**
 * @param {Response} res
 * @param {number} received
 * @param {number} prevTarget
 */
function resolveDownloadByteTarget(res, received, prevTarget) {
  const fromHeader = estimateDecompressedBytes(res);
  let target = Math.max(prevTarget, fromHeader, received);
  if (received > 0 && target <= received) {
    target = Math.max(target, Math.ceil(received * 1.12));
  }
  return target;
}

/** 下载阶段在总进度中的上限（留余量给 JSON.parse 与建索引） */
const PROGRESS_AFTER_DOWNLOAD = 0.68;
const PROGRESS_AFTER_JSON = 0.78;
const PROGRESS_BEFORE_DONE = 0.99;

/**
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
async function loadOnce(options = {}) {
  const { shouldAbort } = options;
  const dictUrl = `${import.meta.env.BASE_URL}data/dictionary/dict.json`.replace(/\/+/g, "/");
  const res = await fetch(dictUrl);
  if (!res.ok) throw new Error("词典加载失败");

  let downloadByteTarget = estimateDecompressedBytes(res);
  const hasByteEstimate = downloadByteTarget > 0;

  let text = "";
  if (res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    while (true) {
      if (shouldAbort?.()) return;
      const { done, value } = await reader.read();
      if (done) break;
      received += value.length;
      if (hasByteEstimate) {
        downloadByteTarget = resolveDownloadByteTarget(res, received, downloadByteTarget);
        const ratio = Math.min(1, received / downloadByteTarget);
        bumpLoadProgress(ratio * PROGRESS_AFTER_DOWNLOAD);
      } else {
        bumpLoadProgress(
          PROGRESS_AFTER_DOWNLOAD * (1 - Math.exp(-received / (4 * 1024 * 1024))),
        );
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } else {
    text = await res.text();
    bumpLoadProgress(PROGRESS_AFTER_DOWNLOAD * 0.92);
  }

  if (shouldAbort?.()) return;
  bumpLoadProgress(PROGRESS_AFTER_DOWNLOAD);

  await raf();
  bumpLoadProgress(PROGRESS_AFTER_DOWNLOAD + 0.04);

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
   * 带通配符 `?` 的匹配：例如 `c?t` 可匹配 `cat` / `cut`。
   * 返回首个命中的真实单词（小写）；无命中返回 null。
   */
  function resolveWordPattern(word, wildcardChar = "?") {
    const raw = String(word).toLowerCase().trim();
    if (!raw) return null;
    const set = wordSet.value;
    if (!(set instanceof Set)) return null;
    if (!raw.includes(wildcardChar)) {
      return set.has(raw) && isWordAllowedByAbbrevSetting(raw) ? raw : null;
    }
    const byLength = wordsByLength.value;
    const candidates = byLength instanceof Map ? byLength.get(raw.length) : null;
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    outer: for (const candidate of candidates) {
      if (!isWordAllowedByAbbrevSetting(candidate)) continue;
      for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch !== wildcardChar && ch !== candidate[i]) continue outer;
      }
      return candidate;
    }
    return null;
  }

  function isValidWordPattern(word, wildcardChar = "?") {
    return resolveWordPattern(word, wildcardChar) != null;
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
