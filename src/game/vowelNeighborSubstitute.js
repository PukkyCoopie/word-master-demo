/** 宝藏 95：元音邻位替换（aeiou 线性链，首尾不相邻） */

export const VOWEL_SUBSTITUTE_TREASURE_ID = "95";

const VOWELS = Object.freeze(["a", "e", "i", "o", "u"]);

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function hasVowelNeighborSubstitute(ownedSlotTreasureIds) {
  return (ownedSlotTreasureIds ?? []).includes(VOWEL_SUBSTITUTE_TREASURE_ID);
}

/** @param {string} ch 单字母小写 */
export function vowelNeighborLetters(ch) {
  const c = String(ch ?? "").toLowerCase();
  const i = VOWELS.indexOf(c);
  if (i < 0) return null;
  return {
    prev: i > 0 ? VOWELS[i - 1] : null,
    self: VOWELS[i],
    next: i < VOWELS.length - 1 ? VOWELS[i + 1] : null,
  };
}

/** @param {string} ch */
export function isSubstitutableVowel(ch) {
  return vowelNeighborLetters(ch) != null;
}

/**
 * 牌张自然字母 + 显示偏移（-1/0/1）→ 当前展示字母
 * @param {string} naturalRaw 小写单字母
 * @param {number} [displayShift=0]
 */
export function vowelDisplayLetter(naturalRaw, displayShift = 0) {
  const n = vowelNeighborLetters(naturalRaw);
  if (!n) return String(naturalRaw ?? "").toLowerCase();
  const sh = Math.sign(Number(displayShift) || 0);
  if (sh < 0) return n.prev ?? n.self;
  if (sh > 0) return n.next ?? n.self;
  return n.self;
}

/**
 * 嘴宝藏 UI：三格 [prev, 自然, next] 滑动窗口；中心为当前展示字母，两侧为同牌张 trio 中其余位（链端为空）
 * @param {string} naturalRaw 牌张自然元音（小写）
 * @param {number} [displayShift=0]
 * @returns {{ prev: string | null, next: string | null } | null}
 */
/**
 * 自然元音与词典解析字母 → 展示偏移（-1/0/1）
 * @param {string} naturalRaw
 * @param {string} resolvedCh
 */
export function vowelDisplayShiftForResolved(naturalRaw, resolvedCh) {
  const c = String(naturalRaw ?? "").toLowerCase().charAt(0);
  const n = vowelNeighborLetters(c);
  if (!n) return 0;
  const d = String(resolvedCh ?? "").toLowerCase().charAt(0);
  if (n.prev != null && d === n.prev) return -1;
  if (n.next != null && d === n.next) return 1;
  return 0;
}

export function vowelGhostSlotsForDisplay(naturalRaw, displayShift = 0) {
  const c = String(naturalRaw ?? "").toLowerCase().charAt(0);
  const n = vowelNeighborLetters(c);
  if (!n) return null;
  const displayed = vowelDisplayLetter(c, displayShift);
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
 */
export function resolveWordPatternWithVowelSubstitutions(pattern, vowelAltMask, resolveExact) {
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
    const opts = vowelNeighborLetters(letters[i]);
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
 * 本词解析结果相对「选中串自然字母」哪些下标用了邻位元音
 * @param {string} selectedPattern 选中 tile 串（小写）
 * @param {string} resolvedWord
 * @param {boolean[]} vowelAltMask
 * @returns {boolean[]}
 */
export function computeVowelSubstitutionUsedMask(selectedPattern, resolvedWord, vowelAltMask) {
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
    used.push(natural !== resolved && isSubstitutableVowel(natural));
  }
  return used;
}

/**
 * 拼词成功后轮换牌张元音展示偏移（与 dev 备注「位置循环」一致）
 * @param {object} deckCard
 * @param {boolean} usedSubstitution 本词是否用了邻位
 */
export function cycleVowelDisplayShiftOnDeckCard(deckCard, usedSubstitution) {
  if (!deckCard || typeof deckCard !== "object" || !usedSubstitution) return;
  const raw = String(deckCard.raw ?? "").toLowerCase();
  if (!isSubstitutableVowel(raw)) return;
  const cur = Math.sign(Number(deckCard.vowelDisplayShift) || 0);
  deckCard.vowelDisplayShift = cur >= 1 ? -1 : cur + 1;
}
