import {
  getDictionaryIndexYieldEvery,
  yieldDuringDictionaryIndex,
} from "./dictionaryLowEnd.js";
import { iterateTrimmedLines, parseCoreJsonlLine, parseDefsJsonlLine, estimateLineCountFromText } from "./dictionaryJsonlParse.js";

/**
 * @param {string} posField
 * @returns {string[]}
 */
export function splitPosFieldTokens(posField) {
  return String(posField ?? "")
    .trim()
    .toLowerCase()
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * @param {string} coreText
 * @param {{
 *   shouldAbort?: () => boolean,
 *   onProgress?: (ratio01: number) => void,
 *   estimatedRows?: number,
 * }} [options]
 */
export async function buildDictionaryIndexesFromCoreText(coreText, options = {}) {
  const { shouldAbort, onProgress, estimatedRows } = options;
  const set = new Set();
  const map = new Map();
  const byLength = new Map();
  /** @type {Map<string, Set<string>>} */
  const posTagsLocal = new Map();

  const est = Math.max(1, estimatedRows ?? estimateLineCountFromText(coreText));
  const yieldEvery = getDictionaryIndexYieldEvery(est);
  let processed = 0;

  for (const line of iterateTrimmedLines(coreText)) {
    if (shouldAbort?.()) return null;
    const parsed = parseCoreJsonlLine(line);
    if (!parsed) continue;
    const w = parsed.word.toLowerCase();
    set.add(w);
    if (!map.has(w)) {
      map.set(w, { word: w, pos: parsed.pos, translation_zh: "" });
    }
    for (const token of splitPosFieldTokens(parsed.pos)) {
      if (!posTagsLocal.has(w)) posTagsLocal.set(w, new Set());
      posTagsLocal.get(w).add(token);
    }
    const len = w.length;
    if (!byLength.has(len)) byLength.set(len, []);
    byLength.get(len).push(w);

    processed += 1;
    if (processed % yieldEvery === 0) {
      onProgress?.(processed / est);
      await yieldDuringDictionaryIndex();
    }
  }

  onProgress?.(1);
  return { set, map, byLength, posTagsLocal };
}

/**
 * @param {Map<string, { word: string, pos: string, translation_zh: string }>} map
 * @param {string} defsText
 * @param {{ shouldAbort?: () => boolean }} [options]
 */
export async function mergeDictionaryDefinitions(map, defsText, options = {}) {
  const { shouldAbort } = options;
  if (!(map instanceof Map) || !defsText) return;

  const est = Math.max(1, estimateLineCountFromText(defsText));
  const yieldEvery = getDictionaryIndexYieldEvery(est);
  let processed = 0;

  for (const line of iterateTrimmedLines(defsText)) {
    if (shouldAbort?.()) return;
    const parsed = parseDefsJsonlLine(line);
    if (!parsed) continue;
    const w = parsed.word.toLowerCase();
    const entry = map.get(w);
    if (entry) entry.translation_zh = parsed.translation_zh;
    else map.set(w, { word: w, pos: "", translation_zh: parsed.translation_zh });

    processed += 1;
    if (processed % yieldEvery === 0) {
      await yieldDuringDictionaryIndex();
    }
  }
}
