/**
 * 整局对战统计（胜利/失败弹窗展示）。
 * @typedef {{
 *   bestWord: string,
 *   bestWordScore: number,
 *   longestWord: string,
 *   longestWordLength: number,
 *   lengthCounts: Map<number, number>,
 *   lettersUsed: number,
 *   lettersDiscarded: number,
 *   wordsSubmitted: number,
 *   shopPurchases: number,
 *   rerolls: number,
 * }} RunMatchStats
 */

/** @returns {RunMatchStats} */
export function createRunMatchStats() {
  return {
    bestWord: "",
    bestWordScore: 0,
    longestWord: "",
    longestWordLength: 0,
    lengthCounts: new Map(),
    lettersUsed: 0,
    lettersDiscarded: 0,
    wordsSubmitted: 0,
    shopPurchases: 0,
    rerolls: 0,
  };
}

/**
 * @param {RunMatchStats} stats
 * @param {{ word: string, score: number, length: number }} payload
 */
export function recordWordSubmit(stats, { word, score, length }) {
  const w = String(word ?? "").trim();
  const sc = Math.max(0, Math.round(Number(score) || 0));
  const len = Math.max(0, Math.floor(Number(length) || 0));
  if (len > 0) {
    stats.lengthCounts.set(len, (stats.lengthCounts.get(len) ?? 0) + 1);
  }
  if (len > 0) stats.lettersUsed += len;
  stats.wordsSubmitted += 1;
  if (w && sc >= stats.bestWordScore) {
    stats.bestWord = w;
    stats.bestWordScore = sc;
  }
  if (w && len >= stats.longestWordLength) {
    stats.longestWord = w;
    stats.longestWordLength = len;
  }
}

/**
 * @param {RunMatchStats} stats
 * @param {number} count
 */
export function recordLettersDiscarded(stats, count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n > 0) stats.lettersDiscarded += n;
}

/** @param {RunMatchStats} stats */
export function recordShopPurchase(stats) {
  stats.shopPurchases += 1;
}

/** @param {RunMatchStats} stats */
export function recordReroll(stats) {
  stats.rerolls += 1;
}

/**
 * @param {Map<number, number>} lengthCounts
 * @returns {number | null}
 */
function resolveMostCommonLength(lengthCounts) {
  let bestLen = null;
  let bestCount = 0;
  for (const [len, count] of lengthCounts) {
    const c = Math.max(0, Math.floor(Number(count) || 0));
    if (c <= 0) continue;
    if (bestLen == null || c > bestCount || (c === bestCount && len > bestLen)) {
      bestLen = len;
      bestCount = c;
    }
  }
  return bestLen;
}

/**
 * @param {RunMatchStats} stats
 * @returns {{ label: string, value: string }[]}
 */
export function getRunMatchStatsRows(stats) {
  const best = stats.bestWord
    ? `${stats.bestWord.toUpperCase()}（${stats.bestWordScore.toLocaleString("zh-CN")}）`
    : "—";
  const longest = stats.longestWord ? stats.longestWord.toUpperCase() : "—";
  const commonLen = resolveMostCommonLength(stats.lengthCounts);
  return [
    { label: "最佳单词", value: best },
    { label: "最长单词", value: longest },
    { label: "最常拼写长度", value: commonLen != null ? String(commonLen) : "—" },
    { label: "使用字母数", value: String(stats.lettersUsed) },
    { label: "弃掉字母数", value: String(stats.lettersDiscarded) },
    { label: "购物数", value: String(stats.shopPurchases) },
    { label: "重掷次数", value: String(stats.rerolls) },
  ];
}
