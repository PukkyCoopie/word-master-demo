/** @param {string} word */
export function normalizeFavoriteWordKey(word) {
  return String(word ?? "").toLowerCase().trim();
}

/** @param {unknown} raw @returns {string[]} */
function normalizeDefinitionLines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((line) => String(line ?? "").trim())
    .filter((line) => line.length > 0);
}

/** @param {unknown} raw @returns {import('../collection/collectionTypes.js').WordFavoriteEntry[]} */
export function normalizeWordFavoriteEntries(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  /** @type {import('../collection/collectionTypes.js').WordFavoriteEntry[]} */
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = /** @type {Record<string, unknown>} */ (item);
    const word = normalizeFavoriteWordKey(o.word);
    if (!word || seen.has(word)) continue;
    seen.add(word);
    const favoritedAt = Number.isFinite(Number(o.favoritedAt))
      ? Math.floor(Number(o.favoritedAt))
      : 0;
    out.push({
      word,
      favoritedAt,
      definitionLines: normalizeDefinitionLines(o.definitionLines),
    });
  }
  return out;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @returns {import('../collection/collectionTypes.js').WordFavoriteEntry[]}
 */
export function getFavoriteWords(career) {
  return normalizeWordFavoriteEntries(career?.favoriteWords);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats | Record<string, unknown>} career
 * @param {string} word
 */
export function isWordFavorited(career, word) {
  const key = normalizeFavoriteWordKey(word);
  if (!key) return false;
  return getFavoriteWords(career).some((entry) => entry.word === key);
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {{ word: string, definitionLines?: string[] }} payload
 * @returns {boolean} 收藏后为 true，取消后为 false
 */
export function toggleWordFavorite(career, { word, definitionLines = [] }) {
  const key = normalizeFavoriteWordKey(word);
  if (!key) return false;
  if (!Array.isArray(career.favoriteWords)) {
    career.favoriteWords = [];
  }
  const list = normalizeWordFavoriteEntries(career.favoriteWords);
  const ix = list.findIndex((entry) => entry.word === key);
  if (ix >= 0) {
    list.splice(ix, 1);
    career.favoriteWords = list;
    return false;
  }
  list.unshift({
    word: key,
    favoritedAt: Date.now(),
    definitionLines: normalizeDefinitionLines(definitionLines),
  });
  career.favoriteWords = list;
  return true;
}

/**
 * @param {import('../save/runSaveSchema.js').SlotCareerStats} career
 * @param {string} word
 * @returns {boolean} 是否已移除
 */
export function removeWordFavorite(career, word) {
  const key = normalizeFavoriteWordKey(word);
  if (!key || !Array.isArray(career.favoriteWords)) return false;
  const list = normalizeWordFavoriteEntries(career.favoriteWords);
  const next = list.filter((entry) => entry.word !== key);
  if (next.length === list.length) return false;
  career.favoriteWords = next;
  return true;
}
