/**
 * 从已加载词典随机抽取相邻双字母（用于 bigram 宝藏）。
 */

/** @param {() => number} rng */
function pickInt(rng, max) {
  return Math.floor(rng() * max);
}

/**
 * @param {import('../composables/useDictionary.js').ReturnType<import('../composables/useDictionary.js').useDictionary>['getCandidateWordsByLength']} getCandidateWordsByLength
 * @param {() => number} rng
 * @returns {string | null} 两个小写字母，如 "na"
 */
export function rollRandomBigramFromDictionary(getCandidateWordsByLength, rng = Math.random) {
  if (typeof getCandidateWordsByLength !== "function") return null;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const len = 4 + pickInt(rng, 6);
    const words = getCandidateWordsByLength(len);
    if (!Array.isArray(words) || words.length === 0) continue;
    const w = String(words[pickInt(rng, words.length)] ?? "").toLowerCase();
    if (w.length < 2) continue;
    const i = pickInt(rng, w.length - 1);
    const pair = w.slice(i, i + 2);
    if (/^[a-z]{2}$/.test(pair)) return pair;
  }
  return "th";
}

/**
 * @param {string} word
 * @param {string} pair 两字母
 * @returns {number} 词中该相邻对出现次数
 */
/**
 * 本局证件（46）目标双字母：整局固定，未掷出时用 `rollFn` 掷一次（商店未购也可预览）。
 * @param {import('../treasures/treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {() => string | null | undefined} [rollFn]
 * @returns {string | null}
 */
export function ensureBigramTargetPair(runState, rollFn) {
  if (!runState) return null;
  if (runState.bigramTargetPair) return runState.bigramTargetPair;
  if (typeof rollFn !== "function") return null;
  const rolled = rollFn();
  if (typeof rolled === "string" && /^[a-z]{2}$/i.test(rolled)) {
    runState.bigramTargetPair = rolled.toLowerCase();
  }
  return runState.bigramTargetPair;
}

export function countBigramOccurrencesInWord(word, pair) {
  const w = String(word ?? "").toLowerCase();
  const p = String(pair ?? "").toLowerCase();
  if (w.length < 2 || p.length !== 2) return 0;
  let n = 0;
  for (let i = 1; i < w.length; i += 1) {
    if (w[i - 1] === p[0] && w[i] === p[1]) n += 1;
  }
  return n;
}
