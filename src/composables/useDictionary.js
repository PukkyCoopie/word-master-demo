import { ref, shallowRef, computed } from "vue";

/** 词典条目 [word, pos, translation_zh] → 小写 word 为 key 的 Map */
const wordSet = shallowRef(null);
const wordInfoMap = shallowRef(null);
/** 小写单词按长度分桶，便于 ? 通配符快速匹配 */
const wordsByLength = shallowRef(null);

/** 全局共享：App 预加载与 GamePanel 共用 */
const dictLoaded = ref(false);
const dictLoading = ref(false);
const dictError = ref(null);
/** 0～1，下载与解析合并进度 */
const dictLoadProgress = ref(0);

let inFlightLoad = null;

function clamp01(x) {
  return Math.min(1, Math.max(0, x));
}

function setDictProgress(p) {
  dictLoadProgress.value = clamp01(p);
}

/**
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
async function loadOnce(options = {}) {
  const { shouldAbort } = options;
  const dictUrl = `${import.meta.env.BASE_URL}data/dictionary/dict.json`.replace(/\/+/g, "/");
  const res = await fetch(dictUrl);
  if (!res.ok) throw new Error("词典加载失败");

  const totalBytes = Number(res.headers.get("Content-Length") || 0) || 0;
  const DOWNLOAD_SHARE = 0.55;

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
      if (totalBytes > 0) {
        setDictProgress((received / totalBytes) * DOWNLOAD_SHARE);
      } else {
        setDictProgress(DOWNLOAD_SHARE * (1 - Math.exp(-received / (384 * 1024))));
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } else {
    text = await res.text();
    setDictProgress(DOWNLOAD_SHARE * 0.92);
  }

  if (shouldAbort?.()) return;
  setDictProgress(DOWNLOAD_SHARE);

  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("词典格式错误");

  if (shouldAbort?.()) return;
  const set = new Set();
  const map = new Map();
  const byLength = new Map();
  const n = raw.length;
  const PARSE_SHARE = 1 - DOWNLOAD_SHARE;
  const chunk = Math.max(4000, Math.ceil(n / 96));

  for (let i = 0; i < n; i++) {
    const row = raw[i];
    const [word, pos, translation_zh] = row;
    if (!word || typeof word !== "string") continue;
    const w = word.toLowerCase();
    set.add(w);
    if (!map.has(w)) map.set(w, { word: w, pos, translation_zh });
    const len = w.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push(w);

    if (i % chunk === 0) {
      setDictProgress(DOWNLOAD_SHARE + (i / Math.max(1, n)) * PARSE_SHARE);
      if (shouldAbort?.()) return;
      await new Promise((r) => requestAnimationFrame(r));
    }
  }

  if (shouldAbort?.()) return;
  wordSet.value = set;
  wordInfoMap.value = map;
  wordsByLength.value = byLength;
  dictLoaded.value = true;
  setDictProgress(1);
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
      setDictProgress(1);
      return;
    }
    if (inFlightLoad) return inFlightLoad;

    inFlightLoad = (async () => {
      dictLoading.value = true;
      dictError.value = null;
      setDictProgress(0);
      try {
        await loadOnce(options);
      } catch (e) {
        dictError.value = e?.message || "词典加载失败";
        wordSet.value = null;
        wordInfoMap.value = null;
        wordsByLength.value = null;
        dictLoaded.value = false;
        setDictProgress(0);
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
    return set.has(w);
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
      return set.has(raw) ? raw : null;
    }
    const byLength = wordsByLength.value;
    const candidates = byLength instanceof Map ? byLength.get(raw.length) : null;
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    outer: for (const candidate of candidates) {
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
