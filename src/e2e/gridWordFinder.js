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
 * @param {string} word
 * @param {GridCell[]} picked
 * @returns {GridCell[] | null}
 */
export function assignCellsToWord(word, picked) {
  const w = String(word).toLowerCase();
  const pool = picked.map((c, i) => ({ ...c, _i: i }));
  /** @type {GridCell[]} */
  const path = [];
  const used = new Set();

  for (let wi = 0; wi < w.length; wi++) {
    const ch = w[wi];
    let found = -1;
    for (let pi = 0; pi < pool.length; pi++) {
      if (used.has(pi)) continue;
      const cell = pool[pi];
      if (cell.isWildcard || cell.letter.toLowerCase() === ch) {
        found = pi;
        break;
      }
    }
    if (found < 0) return null;
    used.add(found);
    const { _i, ...cell } = pool[found];
    path.push(cell);
  }
  return path.length === w.length ? path : null;
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
