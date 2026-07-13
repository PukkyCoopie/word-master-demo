/**
 * 在棋盘可选格上找可提交词（词典 multiset + 万能块），返回选格顺序。
 * @typedef {{ row: number, col: number, letter: string, rarity?: string, isWildcard?: boolean, blocked?: boolean, bossDebuffed?: boolean }} GridCell
 * @typedef {{ word: string, path: GridCell[], pattern: string }} WordPick
 */

/**
 * @param {GridCell[]} picked
 */
export function pickedLetterMultiset(picked) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  let wildcards = 0;
  for (const c of picked) {
    if (c.isWildcard) {
      wildcards += 1;
      continue;
    }
    const ch = c.letter.toLowerCase();
    counts.set(ch, (counts.get(ch) ?? 0) + 1);
  }
  return { counts, wildcards };
}

/**
 * @param {string} word
 * @param {ReturnType<typeof pickedLetterMultiset>} ms
 */
export function wordMatchesMultiset(word, ms) {
  const need = new Map(ms.counts);
  let wild = ms.wildcards;
  for (const ch of String(word).toLowerCase()) {
    const n = need.get(ch) ?? 0;
    if (n > 0) need.set(ch, n - 1);
    else if (wild > 0) wild -= 1;
    else return false;
  }
  return true;
}

/**
 * @param {GridCell} cell
 * @param {string} ch
 * @returns {boolean}
 */
function cellMatchesWordLetter(cell, ch) {
  if (cell.isWildcard) return true;
  const letter = cell.letter.toLowerCase();
  return letter === ch || (letter === "qu" && ch === "q");
}

/**
 * @param {string} word
 * @param {GridCell[]} pool
 * @param {number} wi
 * @param {Set<number>} used
 * @param {GridCell[]} path
 * @param {((path: GridCell[]) => boolean) | null | undefined} acceptPath
 * @returns {GridCell[] | null}
 */
function backtrackAssignCellsToWord(word, pool, wi, used, path, acceptPath) {
  if (wi >= word.length) {
    if (acceptPath && !acceptPath(path)) return null;
    return [...path];
  }

  const ch = word[wi];
  for (let pi = 0; pi < pool.length; pi += 1) {
    if (used.has(pi)) continue;
    const cell = pool[pi];
    if (!cellMatchesWordLetter(cell, ch)) continue;

    used.add(pi);
    path.push(cell);
    const found = backtrackAssignCellsToWord(word, pool, wi + 1, used, path, acceptPath);
    if (found) return found;
    path.pop();
    used.delete(pi);
  }
  return null;
}

/**
 * @param {string} word
 * @param {GridCell[]} picked
 * @param {{ anchor?: GridCell | null, acceptPath?: (path: GridCell[]) => boolean }} [opts]
 * @returns {GridCell[] | null}
 */
export function assignCellsToWord(word, picked, opts = {}) {
  const anchor = opts.anchor ?? null;
  const acceptPath = opts.acceptPath ?? null;
  const w = String(word).toLowerCase();
  if (!w.length) return null;

  if (anchor) {
    const ch0 = w[0];
    if (!cellMatchesWordLetter(anchor, ch0)) return null;
    const restPool = picked.filter((c) => !(c.row === anchor.row && c.col === anchor.col));
    const restPath = assignCellsToWord(w.slice(1), restPool, {
      acceptPath: acceptPath ? (rest) => acceptPath([anchor, ...rest]) : null,
    });
    if (!restPath) return null;
    return [anchor, ...restPath];
  }

  const pool = picked.filter((c) => c?.letter);
  return backtrackAssignCellsToWord(w, pool, 0, new Set(), [], acceptPath);
}

/**
 * @param {GridCell[]} path
 * @returns {number}
 */
export function countDebuffedLettersInPath(path) {
  if (!Array.isArray(path)) return 0;
  return path.filter((c) => c?.bossDebuffed === true).length;
}

const MIN_WORD_LEN = 3;
const MAX_WORD_LEN = 12;

/**
 * 遍历词典（按长度分桶），在整盘可用字母 multiset 上匹配，避免 2^n 子集爆炸。
 * @param {GridCell[]} cells
 * @param {(len: number) => string[] | undefined} getCandidatesByLength
 * @param {(pattern: string, wc?: string) => string | null} resolveWordPattern
 * @returns {WordPick[]}
 */
export function findAllValidWordsOnGrid(cells, getCandidatesByLength, resolveWordPattern) {
  const available = cells.filter(
    (c) => c?.letter && !c.blocked && !c.bossDebuffed,
  );
  if (available.length < MIN_WORD_LEN) return [];

  const gridMs = pickedLetterMultiset(available);
  /** @type {WordPick[]} */
  const out = [];
  const seen = new Set();

  const maxLen = Math.min(MAX_WORD_LEN, available.length);
  for (let L = MIN_WORD_LEN; L <= maxLen; L++) {
    const candidates = getCandidatesByLength(L);
    if (!Array.isArray(candidates) || !candidates.length) continue;

    for (const word of candidates) {
      if (!wordMatchesMultiset(word, gridMs)) continue;
      const path = assignCellsToWord(word, available);
      if (!path) continue;
      const pattern = path
        .map((c) => (c.isWildcard ? "?" : c.letter.toLowerCase()))
        .join("");
      const resolved = resolveWordPattern(pattern, "?");
      if (!resolved || resolved !== word) continue;
      const key = `${word}|${path.map((p) => `${p.row},${p.col}`).join(";")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ word, path, pattern });
    }
  }
  return out;
}

/**
 * @param {WordPick[]} picks
 * @param {(pick: WordPick) => number} scorePick
 */
export function pickBestWord(picks, scorePick) {
  let best = null;
  let bestScore = -Infinity;
  for (const p of picks) {
    const s = scorePick(p);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}
