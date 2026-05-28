/** 宝藏 95：元音邻位替换；宝藏 30：试管（全视为元音）时与 95 联动——辅音按字母表邻位 */

export const VOWEL_SUBSTITUTE_TREASURE_ID = "95";
export const TEST_TUBE_ALL_VOWEL_TREASURE_ID = "30";
export const HAMMER_ALL_CONSONANT_TREASURE_ID = "31";

const VOWELS = Object.freeze(["a", "e", "i", "o", "u"]);

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function hasVowelNeighborSubstitute(ownedSlotTreasureIds) {
  return (ownedSlotTreasureIds ?? []).includes(VOWEL_SUBSTITUTE_TREASURE_ID);
}

/** 试管：拼词邻位对非 aeiou 字母按字母表展开（与锤子叠放时仍生效） */
/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function hasTestTubeAllVowelsForMouth(ownedSlotTreasureIds) {
  return (ownedSlotTreasureIds ?? []).includes(TEST_TUBE_ALL_VOWEL_TREASURE_ID);
}

/** @param {string} ch */
function normalizeSubstLetter(ch) {
  const c = String(ch ?? "").toLowerCase().charAt(0);
  return /^[a-z]$/.test(c) ? c : null;
}

/** @param {string} c */
function alphabetNeighborTrio(c) {
  const code = c.charCodeAt(0);
  return {
    prev: code > "a".charCodeAt(0) ? String.fromCharCode(code - 1) : null,
    self: c,
    next: code < "z".charCodeAt(0) ? String.fromCharCode(code + 1) : null,
  };
}

/** @param {string} ch 单字母小写 */
export function vowelNeighborLetters(ch) {
  const c = normalizeSubstLetter(ch);
  if (!c) return null;
  const i = VOWELS.indexOf(c);
  if (i < 0) return null;
  return {
    prev: i > 0 ? VOWELS[i - 1] : null,
    self: VOWELS[i],
    next: i < VOWELS.length - 1 ? VOWELS[i + 1] : null,
  };
}

/**
 * 嘴（±试管）下该自然字母的三邻位：aeiou 走元音链；试管+嘴时对其它 a–z 走字母表前后位。
 * @param {string} ch
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 * @returns {{ prev: string | null, self: string, next: string | null } | null}
 */
export function letterSubstituteNeighborTrio(ch, ownedSlotTreasureIds = []) {
  const c = normalizeSubstLetter(ch);
  if (!c) return null;
  const vowelTrio = vowelNeighborLetters(c);
  if (vowelTrio) return vowelTrio;
  if (!hasTestTubeAllVowelsForMouth(ownedSlotTreasureIds)) return null;
  return alphabetNeighborTrio(c);
}

/** @param {string} ch */
export function isSubstitutableVowel(ch) {
  return vowelNeighborLetters(ch) != null;
}

/** @param {string} ch @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function isLetterSubstitutableForMouth(ch, ownedSlotTreasureIds) {
  if (!hasVowelNeighborSubstitute(ownedSlotTreasureIds)) return false;
  return letterSubstituteNeighborTrio(ch, ownedSlotTreasureIds) != null;
}

/**
 * 牌张自然字母 + 显示偏移（-1/0/1）→ 当前展示字母
 * @param {string} naturalRaw 小写单字母
 * @param {number} [displayShift=0]
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function vowelDisplayLetter(naturalRaw, displayShift = 0, ownedSlotTreasureIds = []) {
  let n = letterSubstituteNeighborTrio(naturalRaw, ownedSlotTreasureIds);
  if (!n && Math.sign(Number(displayShift) || 0) !== 0) {
    const c = normalizeSubstLetter(naturalRaw);
    if (c) n = alphabetNeighborTrio(c);
  }
  if (!n) return String(naturalRaw ?? "").toLowerCase();
  const sh = Math.sign(Number(displayShift) || 0);
  if (sh < 0) return n.prev ?? n.self;
  if (sh > 0) return n.next ?? n.self;
  return n.self;
}

/**
 * 自然字母与词典解析字母 → 展示偏移（-1/0/1）
 * @param {string} naturalRaw
 * @param {string} resolvedCh
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function vowelDisplayShiftForResolved(naturalRaw, resolvedCh, ownedSlotTreasureIds = []) {
  const c = String(naturalRaw ?? "").toLowerCase().charAt(0);
  const n = letterSubstituteNeighborTrio(c, ownedSlotTreasureIds);
  if (!n) return 0;
  const d = String(resolvedCh ?? "").toLowerCase().charAt(0);
  if (n.prev != null && d === n.prev) return -1;
  if (n.next != null && d === n.next) return 1;
  return 0;
}

/** @param {string} naturalRaw @param {number} [displayShift] @param {(string | null | undefined)[]} [ownedSlotTreasureIds] */
export function vowelGhostSlotsForDisplay(naturalRaw, displayShift = 0, ownedSlotTreasureIds = []) {
  const c = String(naturalRaw ?? "").toLowerCase().charAt(0);
  const n = letterSubstituteNeighborTrio(c, ownedSlotTreasureIds);
  if (!n) return null;
  const displayed = vowelDisplayLetter(c, displayShift, ownedSlotTreasureIds);
  let centerIdx = 1;
  if (n.prev != null && displayed === n.prev) centerIdx = 0;
  else if (n.next != null && displayed === n.next) centerIdx = 2;
  const slots = [n.prev, n.self, n.next];
  return {
    prev: slots[centerIdx - 1] ?? null,
    next: slots[centerIdx + 1] ?? null,
  };
}

/**
 * @param {string} pattern 小写串（棋盘选中串）
 * @param {boolean[]} vowelAltMask 与 pattern 等长
 * @param {(p: string) => string | null} resolveExact 无通配解析
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function resolveWordPatternWithVowelSubstitutions(
  pattern,
  vowelAltMask,
  resolveExact,
  ownedSlotTreasureIds = [],
) {
  const raw = String(pattern ?? "").toLowerCase().trim();
  if (!raw) return null;
  if (!vowelAltMask?.length) return resolveExact(raw);

  /** @type {string[]} */
  const letters = [];
  for (let i = 0; i < raw.length; i++) letters.push(raw[i]);

  /**
   * @param {number} i
   * @returns {string | null}
   */
  function dfs(i) {
    if (i >= letters.length) return resolveExact(letters.join(""));
    if (!vowelAltMask[i]) {
      const ch = letters[i];
      if (ch === "?") {
        // 保留万能，交给 resolveExact
      } else if (!/[a-z]/.test(ch)) return null;
      const saved = letters[i];
      const rest = dfs(i + 1);
      letters[i] = saved;
      return rest;
    }
    const opts = letterSubstituteNeighborTrio(letters[i], ownedSlotTreasureIds);
    if (!opts) return dfs(i + 1);
    const candidates = [opts.prev, opts.self, opts.next].filter((c) => c != null);
    for (const c of candidates) {
      const saved = letters[i];
      letters[i] = c;
      const hit = dfs(i + 1);
      if (hit) return hit;
      letters[i] = saved;
    }
    return null;
  }

  return dfs(0);
}

/**
 * @param {string} selectedPattern
 * @param {string} resolvedWord
 * @param {boolean[]} vowelAltMask
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function computeVowelSubstitutionUsedMask(
  selectedPattern,
  resolvedWord,
  vowelAltMask,
  ownedSlotTreasureIds = [],
) {
  const len = Math.min(selectedPattern.length, resolvedWord.length, vowelAltMask.length);
  /** @type {boolean[]} */
  const used = [];
  for (let i = 0; i < len; i++) {
    if (!vowelAltMask[i]) {
      used.push(false);
      continue;
    }
    const natural = String(selectedPattern[i] ?? "").toLowerCase();
    const resolved = String(resolvedWord[i] ?? "").toLowerCase();
    used.push(
      natural !== resolved && isLetterSubstitutableForMouth(natural, ownedSlotTreasureIds),
    );
  }
  return used;
}

/**
 * @param {object} deckCard
 * @param {boolean} usedSubstitution
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function cycleVowelDisplayShiftOnDeckCard(deckCard, usedSubstitution, ownedSlotTreasureIds = []) {
  if (!deckCard || typeof deckCard !== "object" || !usedSubstitution) return;
  const raw = String(deckCard.raw ?? "").toLowerCase();
  if (!isLetterSubstitutableForMouth(raw, ownedSlotTreasureIds)) return;
  const cur = Math.sign(Number(deckCard.vowelDisplayShift) || 0);
  deckCard.vowelDisplayShift = cur >= 1 ? -1 : cur + 1;
}
