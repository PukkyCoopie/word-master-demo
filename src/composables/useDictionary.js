import { ref, shallowRef, computed } from "vue";

/** 词典条目 [word, pos, translation_zh] → 小写 word 为 key 的 Map */
const wordSet = shallowRef(null);
const wordInfoMap = shallowRef(null);
/** 小写单词按长度分桶，便于 ? 通配符快速匹配 */
const wordsByLength = shallowRef(null);

export function useDictionary() {
  const loaded = ref(false);
  const loading = ref(false);
  const error = ref(null);

  /** 仅当正式词典加载成功后才可校验单词 */
  const dictionaryReady = computed(() => wordSet.value instanceof Set);

  /**
   * @param {{ shouldAbort?: () => boolean }} [options]
   */
  async function loadDictionary(options = {}) {
    const { shouldAbort } = options;
    if (wordSet.value) {
      loaded.value = true;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const dictUrl = `${import.meta.env.BASE_URL}data/dictionary/dict.json`.replace(
        /\/+/g,
        "/"
      );
      const res = await fetch(dictUrl);
      if (!res.ok) throw new Error("词典加载失败");
      const raw = await res.json();
      if (shouldAbort?.()) return;
      const set = new Set();
      const map = new Map();
      const byLength = new Map();
      for (const row of raw) {
        const [word, pos, translation_zh] = row;
        if (!word || typeof word !== "string") continue;
        const w = word.toLowerCase();
        set.add(w);
        if (!map.has(w)) map.set(w, { word: w, pos, translation_zh });
        const len = w.length;
        if (!byLength.has(len)) byLength.set(len, []);
        byLength.get(len).push(w);
      }
      if (shouldAbort?.()) return;
      wordSet.value = set;
      wordInfoMap.value = map;
      wordsByLength.value = byLength;
      loaded.value = true;
    } catch (e) {
      error.value = e?.message || "词典加载失败";
      wordSet.value = null;
      wordInfoMap.value = null;
      wordsByLength.value = null;
      loaded.value = false;
    } finally {
      loading.value = false;
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
    if (wordInfoMap.value && wordInfoMap.value.has(w))
      return wordInfoMap.value.get(w);
    return null;
  }

  return {
    loaded,
    loading,
    error,
    dictionaryReady,
    loadDictionary,
    isValidWord,
    isValidWordPattern,
    resolveWordPattern,
    getWordDefinition,
  };
}
