/** @typedef {{ words: string[], byPosChar: Map<number, Map<string, Uint32Array>> }} LengthSlotIndex */

const EMPTY_UINT32 = new Uint32Array(0);

/**
 * 按 (词长, 槽位, 字母) 建倒排索引；wordId 为同长度桶内下标（与 words 数组一致）。
 * @param {Map<number, string[]> | null | undefined} byLength
 * @returns {Map<number, LengthSlotIndex>}
 */
export function buildSlotIndexByLength(byLength) {
  /** @type {Map<number, LengthSlotIndex>} */
  const result = new Map();
  if (!(byLength instanceof Map)) return result;

  for (const [len, words] of byLength) {
    const wordLen = Math.max(0, Math.floor(Number(len)));
    if (wordLen < 1 || !Array.isArray(words) || words.length === 0) continue;

    /** @type {Map<number, Map<string, number[]>>} */
    const posBuckets = new Map();
    for (let pos = 0; pos < wordLen; pos += 1) {
      posBuckets.set(pos, new Map());
    }

    for (let id = 0; id < words.length; id += 1) {
      const w = words[id];
      if (typeof w !== "string" || w.length !== wordLen) continue;
      for (let pos = 0; pos < wordLen; pos += 1) {
        const ch = w[pos];
        const charMap = posBuckets.get(pos);
        if (!charMap) continue;
        if (!charMap.has(ch)) charMap.set(ch, []);
        charMap.get(ch).push(id);
      }
    }

    /** @type {Map<number, Map<string, Uint32Array>>} */
    const byPosChar = new Map();
    for (let pos = 0; pos < wordLen; pos += 1) {
      /** @type {Map<string, Uint32Array>} */
      const charMap = new Map();
      const buckets = posBuckets.get(pos);
      if (buckets) {
        for (const [ch, ids] of buckets) {
          charMap.set(ch, Uint32Array.from(ids));
        }
      }
      byPosChar.set(pos, charMap);
    }

    result.set(wordLen, { words, byPosChar });
  }

  return result;
}

/**
 * @param {Uint32Array} a
 * @param {Uint32Array} b
 * @returns {Uint32Array}
 */
export function intersectSortedWordIds(a, b) {
  if (!a.length || !b.length) return EMPTY_UINT32;
  if (a.length > b.length) return intersectSortedWordIds(b, a);

  /** @type {number[]} */
  const out = [];
  let j = 0;
  for (let i = 0; i < a.length; i += 1) {
    const v = a[i];
    while (j < b.length && b[j] < v) j += 1;
    if (j >= b.length) break;
    if (b[j] === v) {
      out.push(v);
      j += 1;
    }
  }
  return out.length ? Uint32Array.from(out) : EMPTY_UINT32;
}

/**
 * @param {Uint32Array[]} arrays
 * @returns {Uint32Array}
 */
export function unionSortedWordIds(arrays) {
  const lists = arrays.filter((a) => a && a.length > 0);
  if (lists.length === 0) return EMPTY_UINT32;
  if (lists.length === 1) return lists[0];

  /** @type {number[]} */
  const out = [];
  const cursors = lists.map(() => 0);
  while (true) {
    let min = Infinity;
    let active = 0;
    for (let i = 0; i < lists.length; i += 1) {
      const arr = lists[i];
      const c = cursors[i];
      if (c >= arr.length) continue;
      active += 1;
      if (arr[c] < min) min = arr[c];
    }
    if (!active) break;
    out.push(min);
    for (let i = 0; i < lists.length; i += 1) {
      const arr = lists[i];
      const c = cursors[i];
      if (c < arr.length && arr[c] === min) cursors[i] = c + 1;
    }
  }
  return out.length ? Uint32Array.from(out) : EMPTY_UINT32;
}

/**
 * @param {LengthSlotIndex} lengthIndex
 * @param {number} pos
 * @param {string} ch
 * @returns {Uint32Array}
 */
export function getSlotWordIds(lengthIndex, pos, ch) {
  const charMap = lengthIndex.byPosChar.get(pos);
  if (!charMap) return EMPTY_UINT32;
  return charMap.get(ch) ?? EMPTY_UINT32;
}

/**
 * @param {LengthSlotIndex} lengthIndex
 * @param {Uint32Array[]} constraintLists 每个固定位/嘴邻位约束对应一个有序 wordId 列表
 * @returns {Uint32Array}
 */
export function intersectPatternWordIds(lengthIndex, constraintLists) {
  const lists = constraintLists.filter((a) => a && a.length > 0);
  if (lists.length === 0) {
    return Uint32Array.from({ length: lengthIndex.words.length }, (_, i) => i);
  }

  lists.sort((a, b) => a.length - b.length);
  let cur = lists[0];
  for (let i = 1; i < lists.length; i += 1) {
    cur = intersectSortedWordIds(cur, lists[i]);
    if (!cur.length) return EMPTY_UINT32;
  }
  return cur;
}

/**
 * 普通通配 pattern：固定位取 slot 列表。
 * @param {LengthSlotIndex} lengthIndex
 * @param {string} raw
 * @param {string} wildcardChar
 * @returns {Uint32Array}
 */
export function matchWordIdsForPattern(lengthIndex, raw, wildcardChar) {
  /** @type {Uint32Array[]} */
  const constraints = [];
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === wildcardChar) continue;
    const ids = getSlotWordIds(lengthIndex, i, raw[i]);
    if (!ids.length) return EMPTY_UINT32;
    constraints.push(ids);
  }
  return intersectPatternWordIds(lengthIndex, constraints);
}

/**
 * 嘴邻位 + 通配：固定位按 trio 并集，再与其他位交集。
 * @param {LengthSlotIndex} lengthIndex
 * @param {string} raw
 * @param {(import("../game/vowelNeighborSubstitute.js").LetterSubstituteTrio | null)[]} mouthTrios
 * @param {string} wildcardChar
 * @returns {Uint32Array}
 */
export function matchWordIdsForMouthPattern(lengthIndex, raw, mouthTrios, wildcardChar) {
  /** @type {Uint32Array[]} */
  const constraints = [];
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === wildcardChar) continue;
    const trio = mouthTrios[i];
    if (trio) {
      /** @type {Uint32Array[]} */
      const opts = [];
      if (trio.prev) opts.push(getSlotWordIds(lengthIndex, i, trio.prev));
      opts.push(getSlotWordIds(lengthIndex, i, trio.self));
      if (trio.next) opts.push(getSlotWordIds(lengthIndex, i, trio.next));
      const merged = unionSortedWordIds(opts);
      if (!merged.length) return EMPTY_UINT32;
      constraints.push(merged);
    } else {
      const ids = getSlotWordIds(lengthIndex, i, raw[i]);
      if (!ids.length) return EMPTY_UINT32;
      constraints.push(ids);
    }
  }
  return intersectPatternWordIds(lengthIndex, constraints);
}
