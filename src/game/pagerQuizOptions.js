import {
  getWordDefinition,
  getCandidateWordsByLength,
  getDictionaryWordCount,
  isAbbrevOnlyWord,
} from "../composables/useDictionary.js";

const SAME_LEN_SAMPLE = 120;
const ADJ_LEN_SAMPLE = 60;
const TOP_K = 24;
const WEIGHT_EXPONENT = 2;
const SCORE_DIST_1 = 100;
const SCORE_DIST_2 = 40;
const SAME_LEN_BONUS = 8;

/**
 * @param {string} a
 * @param {string} b
 */
function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  /** @type {number[]} */
  let prev = new Array(n + 1);
  /** @type {number[]} */
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const ca = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const cost = ca === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[n];
}

/**
 * @param {string} a
 * @param {string} b
 */
function hasPrefixOverlap(a, b) {
  if (!a || !b || a === b) return false;
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * @param {string} a
 * @param {string} b
 */
function translationOverlapScore(a, b) {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const setA = new Set(x);
  const setB = new Set(y);
  let inter = 0;
  for (const ch of setA) {
    if (setB.has(ch)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  return union > 0 ? inter / union : 0;
}

/**
 * 去除半角/全角括号及其中的内容。
 * @param {string} text
 */
function stripParentheticalContent(text) {
  let s = String(text ?? "");
  for (let i = 0; i < 12; i++) {
    const next = s.replace(/\([^()]*\)/g, "").replace(/（[^（）]*）/g, "");
    if (next === s) break;
    s = next;
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

/**
 * @param {string | null | undefined} translationZh
 */
function isPersonNameTranslation(translationZh) {
  return String(translationZh ?? "").includes("人名");
}

/** @param {string | null | undefined} label */
function isInflectionVariantLabel(label) {
  const t = String(label ?? "").trim();
  if (!t.includes("的变形")) return false;
  const body = t
    .replace(/^(?:n|v|vi|vt|adj|adv|a|prep|conj|pron|num|art|interj|aux|det|abbr)\.\s*/i, "")
    .trim();
  return /的变形\s*$/.test(body);
}

/**
 * 剥除行首方括号/尖括号标签。第一次仅删标签保留后续；第二次起从标签处截断。
 * @param {string} text
 */
function stripLeadingBracketTags(text) {
  let s = String(text ?? "").trim();
  let strippedOnce = false;
  for (let guard = 0; guard < 8; guard++) {
    const m = s.match(/^(\[[^\]]*\]|<[^>]*>)\s*/);
    if (!m) break;
    if (strippedOnce) {
      s = s.slice(0, m.index).trim();
      break;
    }
    s = s.slice(m[0].length).trim();
    strippedOnce = true;
  }
  return s;
}

/**
 * 截断换行、分号；方括号/尖括号按 {@link stripLeadingBracketTags} 规则处理。
 * @param {string | null | undefined} translationZh
 */
function trimPagerQuizTranslationRaw(translationZh) {
  let s = String(translationZh ?? "")
    .trim()
    .replace(/\\n/g, "\n");
  if (!s) return "";
  const nl = s.search(/\r?\n/);
  if (nl >= 0) s = s.slice(0, nl).trim();
  const semi = s.search(/[;；]/);
  if (semi >= 0) s = s.slice(0, semi).trim();
  return stripLeadingBracketTags(s);
}

/**
 * @param {string | null | undefined} translationZh
 */
function trimPagerQuizTranslationRawLenient(translationZh) {
  let s = String(translationZh ?? "")
    .trim()
    .replace(/\\n/g, "\n");
  if (!s) return "";
  const nl = s.search(/\r?\n/);
  if (nl >= 0) s = s.slice(0, nl).trim();
  const semi = s.search(/[;；]/);
  if (semi >= 0) s = s.slice(0, semi).trim();
  const m = s.match(/^(\[[^\]]*\]|<[^>]*>)\s*/);
  if (m) s = s.slice(m[0].length).trim();
  return s;
}

/**
 * @param {string | null | undefined} text
 */
function isAbbrevTranslation(text) {
  return /^abbr\.\s/i.test(String(text ?? "").trim());
}

/**
 * @param {string | null | undefined} translationZh
 * @param {{ allowAbbrev?: boolean }} [opts]
 */
function finalizePagerQuizLabel(candidate, opts = {}) {
  const raw = stripParentheticalContent(candidate);
  if (!raw) return "";
  if (isInflectionVariantLabel(raw)) return "";
  if (!opts.allowAbbrev && isAbbrevTranslation(raw)) return "";
  return raw;
}

/**
 * @param {string | null | undefined} translationZh
 * @param {{ allowAbbrev?: boolean }} [opts]
 */
export function pickPagerQuizTranslationLabel(translationZh, opts = {}) {
  const strict = finalizePagerQuizLabel(trimPagerQuizTranslationRaw(translationZh), opts);
  if (strict) return strict;
  const lenient = finalizePagerQuizLabel(trimPagerQuizTranslationRawLenient(translationZh), opts);
  if (lenient) return lenient;
  const rawOnly = finalizePagerQuizLabel(
    String(translationZh ?? "")
      .trim()
      .replace(/\\n/g, "\n")
      .split(/\r?\n/)[0]
      ?.split(/[;；]/)[0]
      ?.trim() ?? "",
    opts,
  );
  return rawOnly;
}

/**
 * @param {string} word
 * @param {string | null | undefined} translationZh
 */
function pickPagerQuizLabelForWord(word, translationZh) {
  const allowAbbrev = isAbbrevOnlyWord(word);
  return pickPagerQuizTranslationLabel(translationZh, { allowAbbrev });
}

/**
 * @param {string} word
 * @param {string} label
 * @param {string | null | undefined} [translationZh]
 */
function isValidPagerQuizDistractor(word, label, translationZh) {
  if (!label) return false;
  if (isAbbrevOnlyWord(word)) return false;
  if (isAbbrevTranslation(label)) return false;
  if (isPersonNameTranslation(translationZh)) return false;
  if (isInflectionVariantLabel(label)) return false;
  if (isInflectionVariantLabel(trimPagerQuizTranslationRaw(translationZh))) return false;
  return true;
}

/**
 * @param {readonly unknown[]} arr
 * @param {number} count
 * @param {() => number} rng
 */
function sampleFromArray(arr, count, rng) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const n = Math.min(count, arr.length);
  const indices = arr.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, n).map((i) => arr[i]);
}

/**
 * @param {{ word: string, score: number }[]} pool
 * @param {number} pickCount
 * @param {() => number} rng
 */
export function pickWeightedWithoutReplacement(pool, pickCount, rng) {
  const remaining = pool.map((p) => ({ ...p }));
  /** @type {{ word: string, score: number }[]} */
  const picked = [];
  for (let n = 0; n < pickCount && remaining.length > 0; n++) {
    let total = 0;
    const weights = remaining.map((item) => {
      const w = Math.pow(Math.max(0, item.score), WEIGHT_EXPONENT);
      total += w;
      return w;
    });
    if (total <= 0) break;
    let roll = rng() * total;
    let idx = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    picked.push(remaining[idx]);
    remaining.splice(idx, 1);
  }
  return picked;
}

/**
 * @param {string} word
 * @param {string} candidate
 * @param {string} correctLabel
 * @param {number} targetLen
 */
function scoreLookalikeCandidate(word, candidate, correctLabel, targetLen) {
  if (!candidate || candidate === word) return 0;
  if (hasPrefixOverlap(word, candidate)) return 0;
  const lenDiff = Math.abs(candidate.length - targetLen);
  if (lenDiff > 1) return 0;
  const dist = levenshtein(word, candidate);
  if (dist > 2) return 0;
  const candDef = getWordDefinition(candidate);
  const candLabel = pickPagerQuizLabelForWord(candidate, candDef?.translation_zh);
  if (
    !candLabel ||
    candLabel === correctLabel ||
    !isValidPagerQuizDistractor(candidate, candLabel, candDef?.translation_zh)
  ) {
    return 0;
  }
  if (translationOverlapScore(correctLabel, candLabel) > 0.5) return 0;
  let score = dist === 1 ? SCORE_DIST_1 : SCORE_DIST_2;
  if (candidate.length === targetLen) score += SAME_LEN_BONUS;
  return score;
}

/**
 * @param {string} word
 * @param {string} correctLabel
 * @param {() => number} rng
 */
function collectLookalikeCandidates(word, correctLabel, rng) {
  const targetLen = word.length;
  /** @type {{ word: string, score: number, label: string }[]} */
  const scored = [];
  const seen = new Set([word]);

  /** @param {number} len @param {number} sampleCount */
  function scanLength(len, sampleCount) {
    const bucket = getCandidateWordsByLength(len);
    if (!bucket.length) return;
    for (const candidate of sampleFromArray(bucket, sampleCount, rng)) {
      const w = String(candidate ?? "").toLowerCase();
      if (!w || seen.has(w)) continue;
      seen.add(w);
      const score = scoreLookalikeCandidate(word, w, correctLabel, targetLen);
      if (score <= 0) continue;
      const def = getWordDefinition(w);
      const label = pickPagerQuizLabelForWord(w, def?.translation_zh);
      if (!label || label === correctLabel || !isValidPagerQuizDistractor(w, label, def?.translation_zh)) continue;
      scored.push({ word: w, score, label });
    }
  }

  scanLength(targetLen, SAME_LEN_SAMPLE);
  if (targetLen > 1) scanLength(targetLen - 1, ADJ_LEN_SAMPLE);
  scanLength(targetLen + 1, ADJ_LEN_SAMPLE);

  return scored;
}

/**
 * @param {string} correctLabel
 * @param {Set<string>} usedWords
 * @param {Set<string>} usedLabels
 * @param {() => number} rng
 */
function pickRandomDistractor(correctLabel, usedWords, usedLabels, rng) {
  const total = getDictionaryWordCount();
  if (total <= 0) return null;
  for (let attempt = 0; attempt < 80; attempt++) {
    const idx = Math.floor(rng() * total);
    const word = getRandomDictionaryWordByIndex(idx);
    if (!word || usedWords.has(word)) continue;
    const def = getWordDefinition(word);
    const label = pickPagerQuizLabelForWord(word, def?.translation_zh);
    if (
      !label ||
      label === correctLabel ||
      usedLabels.has(label) ||
      !isValidPagerQuizDistractor(word, label, def?.translation_zh)
    ) {
      continue;
    }
    return { word, label };
  }
  return null;
}

/** @type {string[] | null} */
let flatWordListCache = null;

function ensureFlatWordList() {
  if (flatWordListCache) return flatWordListCache;
  /** @type {string[]} */
  const out = [];
  for (let len = 3; len <= 16; len++) {
    out.push(...getCandidateWordsByLength(len));
  }
  flatWordListCache = out;
  return out;
}

/**
 * @param {number} index
 */
function getRandomDictionaryWordByIndex(index) {
  const list = ensureFlatWordList();
  if (!list.length) return null;
  return list[Math.max(0, Math.min(list.length - 1, index))] ?? null;
}

/**
 * @param {string} word
 * @param {() => number} [rng]
 * @returns {{ word: string, options: { id: string, label: string, isCorrect: boolean }[], correctIndex: number } | null}
 */
export function buildPagerQuizOptions(word, rng = Math.random) {
  const w = String(word ?? "").toLowerCase().trim();
  if (!w) return null;
  const def = getWordDefinition(w);
  const correctLabel = pickPagerQuizLabelForWord(w, def?.translation_zh);
  if (!correctLabel) return null;

  const usedWords = new Set([w]);
  const usedLabels = new Set([correctLabel]);

  const rawScored = collectLookalikeCandidates(w, correctLabel, rng).filter((item) => {
    if (!item?.label || usedLabels.has(item.label)) return false;
    usedWords.add(item.word);
    usedLabels.add(item.label);
    return true;
  });

  rawScored.sort((a, b) => b.score - a.score);
  const topPool = rawScored.slice(0, TOP_K);
  const lookalikePicks = pickWeightedWithoutReplacement(topPool, 2, rng);

  /** @type {{ id: string, label: string, isCorrect: boolean, word?: string }[]} */
  const options = [
    { id: "correct", label: correctLabel, isCorrect: true, word: w },
  ];

  for (const pick of lookalikePicks) {
    options.push({
      id: `lookalike-${pick.word}`,
      label: pick.label,
      isCorrect: false,
      word: pick.word,
    });
  }

  while (options.length < 3) {
    const filler = pickRandomDistractor(correctLabel, usedWords, usedLabels, rng);
    if (!filler) break;
    usedWords.add(filler.word);
    usedLabels.add(filler.label);
    options.push({
      id: `filler-${filler.word}`,
      label: filler.label,
      isCorrect: false,
      word: filler.word,
    });
  }

  const randomDistractor = pickRandomDistractor(correctLabel, usedWords, usedLabels, rng);
  if (randomDistractor) {
    options.push({
      id: `random-${randomDistractor.word}`,
      label: randomDistractor.label,
      isCorrect: false,
      word: randomDistractor.word,
    });
  }

  while (options.length < 4) {
    const filler = pickRandomDistractor(correctLabel, usedWords, usedLabels, rng);
    if (!filler) break;
    usedWords.add(filler.word);
    usedLabels.add(filler.label);
    options.push({
      id: `extra-${filler.word}`,
      label: filler.label,
      isCorrect: false,
      word: filler.word,
    });
  }

  const filtered = options.filter((o) => String(o.label ?? "").trim());
  if (!filtered.some((o) => o.isCorrect) || filtered.length < 3) return null;

  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }

  const correctIndex = filtered.findIndex((o) => o.isCorrect);
  return {
    word: w,
    options: filtered.map(({ id, label, isCorrect }) => ({ id, label, isCorrect })),
    correctIndex,
  };
}
