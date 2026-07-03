/**
 * Qu 槽 + 嘴邻位：按词长倒排索引交集，避免全词典线性扫描。
 */

import {
  getSlotWordIds,
  intersectPatternWordIds,
  unionSortedWordIds,
} from "./dictionarySlotIndex.js";

/** @typedef {import("./dictionarySlotIndex.js").LengthSlotIndex} LengthSlotIndex */
/** @typedef {import("../game/vowelNeighborSubstitute.js").LetterSubstituteTrio} LetterSubstituteTrio */

/**
 * 枚举 Qu 槽中哪些位展开为 qu 双字（extra = 展开数 = 候选词长 − pattern 槽数）。
 * @param {boolean[]} quSlotMask
 * @param {number} extraNeeded
 * @returns {boolean[][]} 与 pattern 等长的 expand 掩码
 */
export function listQuExpandMasksForExtra(quSlotMask, extraNeeded) {
  /** @type {number[]} */
  const quPositions = [];
  for (let i = 0; i < quSlotMask.length; i += 1) {
    if (quSlotMask[i]) quPositions.push(i);
  }
  const q = quPositions.length;
  const extra = Math.max(0, Math.floor(Number(extraNeeded) || 0));
  if (extra > q) return [];

  /** @type {boolean[][]} */
  const masks = [];
  /** @type {number[]} */
  const picked = [];

  /**
   * @param {number} start
   */
  function rec(start) {
    if (picked.length === extra) {
      const mask = new Array(quSlotMask.length).fill(false);
      for (const ix of picked) mask[ix] = true;
      masks.push(mask);
      return;
    }
    for (let j = start; j < quPositions.length; j += 1) {
      picked.push(quPositions[j]);
      rec(j + 1);
      picked.pop();
    }
  }

  rec(0);
  return masks;
}

/**
 * @param {LengthSlotIndex} lengthIndex
 * @param {number} pos
 * @param {LetterSubstituteTrio | string} trioOrChar
 * @returns {Uint32Array | null} null 表示该位无候选
 */
function mouthTrioWordIdsAt(lengthIndex, pos, trioOrChar) {
  if (trioOrChar && typeof trioOrChar === "object" && "self" in trioOrChar) {
    const trio = trioOrChar;
    /** @type {Uint32Array[]} */
    const opts = [];
    if (trio.prev) opts.push(getSlotWordIds(lengthIndex, pos, trio.prev));
    opts.push(getSlotWordIds(lengthIndex, pos, trio.self));
    if (trio.next) opts.push(getSlotWordIds(lengthIndex, pos, trio.next));
    const merged = unionSortedWordIds(opts);
    return merged.length ? merged : null;
  }
  const ids = getSlotWordIds(lengthIndex, pos, String(trioOrChar));
  return ids.length ? ids : null;
}

/**
 * 按 Qu 展开方案在指定词长上建约束列表；ci  walk 结束须等于 candidateLen。
 * @param {LengthSlotIndex} lengthIndex
 * @param {string} pattern
 * @param {boolean[]} quSlotMask
 * @param {(LetterSubstituteTrio | null)[]} mouthTrios
 * @param {boolean[]} quExpandMask 与 pattern 等长
 * @param {string} wildcardChar
 * @param {number} candidateLen
 * @param {string} [letterQMode="qu"]
 * @returns {Uint32Array[] | null}
 */
export function buildMouthQuSlotConstraints(
  lengthIndex,
  pattern,
  quSlotMask,
  mouthTrios,
  quExpandMask,
  wildcardChar,
  candidateLen,
  letterQMode = "qu",
) {
  const mode = letterQMode;
  /** @type {Uint32Array[]} */
  const constraints = [];
  let pi = 0;
  let ci = 0;

  while (pi < pattern.length) {
    const p = pattern[pi];
    const isQu = quSlotMask[pi] === true && mode === "qu";
    const trio = mouthTrios[pi] ?? null;
    const expand = isQu && quExpandMask[pi] === true;

    if (p === wildcardChar) {
      if (isQu && expand) {
        pi += 1;
        ci += 2;
      } else {
        pi += 1;
        ci += 1;
      }
      continue;
    }

    if (isQu && expand) {
      const qIds = getSlotWordIds(lengthIndex, ci, "q");
      const uIds = getSlotWordIds(lengthIndex, ci + 1, "u");
      if (!qIds.length || !uIds.length) return null;
      constraints.push(qIds, uIds);
      pi += 1;
      ci += 2;
      continue;
    }

    if (isQu) {
      const ids = mouthTrioWordIdsAt(lengthIndex, ci, trio ?? p);
      if (!ids) return null;
      constraints.push(ids);
      pi += 1;
      ci += 1;
      continue;
    }

    const ids = mouthTrioWordIdsAt(lengthIndex, ci, trio ?? p);
    if (!ids) return null;
    constraints.push(ids);
    pi += 1;
    ci += 1;
  }

  if (ci !== candidateLen) return null;
  return constraints;
}

/**
 * Qu 槽 + 嘴：在指定词长与 Qu 展开方案下交集 wordId。
 * @param {LengthSlotIndex} lengthIndex
 * @param {string} pattern
 * @param {boolean[]} quSlotMask
 * @param {(LetterSubstituteTrio | null)[]} mouthTrios
 * @param {boolean[]} quExpandMask
 * @param {string} wildcardChar
 * @param {string} [letterQMode="qu"]
 * @returns {Uint32Array}
 */
export function matchWordIdsForMouthQuSlotExpansion(
  lengthIndex,
  pattern,
  quSlotMask,
  mouthTrios,
  quExpandMask,
  wildcardChar = "?",
  letterQMode = "qu",
) {
  const candidateLen = lengthIndex.words[0]?.length ?? 0;
  const constraints = buildMouthQuSlotConstraints(
    lengthIndex,
    pattern,
    quSlotMask,
    mouthTrios,
    quExpandMask,
    wildcardChar,
    candidateLen,
    letterQMode,
  );
  if (!constraints) return new Uint32Array(0);
  return intersectPatternWordIds(lengthIndex, constraints);
}

/**
 * 遍历词长与 Qu 展开方案，收集所有 slot 交集 wordId（按词长分组）。
 * @param {Map<number, LengthSlotIndex>} slotMaps
 * @param {string} pattern
 * @param {boolean[]} quSlotMask
 * @param {(LetterSubstituteTrio | null)[]} mouthTrios
 * @param {number} quExtra
 * @param {string} wildcardChar
 * @param {string} [letterQMode="qu"]
 * @returns {{ lengthIndex: LengthSlotIndex, wordIds: Uint32Array }[]}
 */
export function collectMouthQuSlotWordIdGroups(
  slotMaps,
  pattern,
  quSlotMask,
  mouthTrios,
  quExtra,
  wildcardChar = "?",
  letterQMode = "qu",
) {
  /** @type {{ lengthIndex: LengthSlotIndex, wordIds: Uint32Array }[]} */
  const groups = [];
  if (!(slotMaps instanceof Map)) return groups;

  const minLen = pattern.length;
  const maxLen = pattern.length + Math.max(0, Math.floor(Number(quExtra) || 0));

  for (let len = minLen; len <= maxLen; len += 1) {
    const lengthIndex = slotMaps.get(len);
    if (!lengthIndex) continue;
    const extra = len - pattern.length;
    const expandMasks = listQuExpandMasksForExtra(quSlotMask, extra);
    /** @type {number[]} */
    const merged = [];
    for (const expandMask of expandMasks) {
      const ids = matchWordIdsForMouthQuSlotExpansion(
        lengthIndex,
        pattern,
        quSlotMask,
        mouthTrios,
        expandMask,
        wildcardChar,
        letterQMode,
      );
      for (let i = 0; i < ids.length; i += 1) merged.push(ids[i]);
    }
    if (!merged.length) continue;
    merged.sort((a, b) => a - b);
    /** @type {number[]} */
    const unique = [];
    for (let i = 0; i < merged.length; i += 1) {
      if (i === 0 || merged[i] !== merged[i - 1]) unique.push(merged[i]);
    }
    groups.push({ lengthIndex, wordIds: Uint32Array.from(unique) });
  }

  return groups;
}
