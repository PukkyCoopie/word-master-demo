/**
 * Boss 词长 / 词性「软规则」：不挡提交，违规时本手计 0 分（由调用方处理）。
 */

/** @typedef {{ key: string, labelZh: string }} BossPosKey */

/** 棘梅可抽取词性（与词典 `pos` 字段做宽松匹配） */
export const BOSS_CLUB_POS_OPTIONS = Object.freeze([
  { key: "n", labelZh: "名词", patterns: [/名|noun|^n\.?$/i, /^n$/i] },
  { key: "v", labelZh: "动词", patterns: [/动|verb|^v\.?$/i, /^v$/i] },
  { key: "adj", labelZh: "形容词", patterns: [/形|adj|a\.|adjective/i] },
]);

/**
 * @param {string | null | undefined} dictPos
 * @param {string} requiredKey `n` | `v` | `adj`
 */
export function dictionaryPosMatchesClubKey(dictPos, requiredKey) {
  const raw = String(dictPos ?? "").trim();
  if (!raw) return false;
  const opt = BOSS_CLUB_POS_OPTIONS.find((o) => o.key === requiredKey);
  if (!opt) return false;
  return opt.patterns.some((re) => re.test(raw));
}

/**
 * @param {{ slug: string, wordLen: number, resolvedWord: string, getWordDefinition: (w: string) => { pos?: string } | null | undefined, usedLengthsThisLevel: Set<number>, mouthLockedLength: number | null, clubRequiredKey: string | null }} ctx
 * @returns {{ violated: boolean, reason: string }}
 */
export function evaluateBossSoftWordViolation(ctx) {
  const slug = String(ctx.slug ?? "");
  if (!slug) return { violated: false, reason: "" };
  const wordLen = Math.max(0, Math.round(Number(ctx.wordLen)) || 0);
  const w = String(ctx.resolvedWord ?? "").toLowerCase().trim();

  if (slug === "the_psychic") {
    if (wordLen !== 5) return { violated: true, reason: "灵媒：须恰好 5 格" };
    return { violated: false, reason: "" };
  }

  if (slug === "the_eye") {
    const used = ctx.usedLengthsThisLevel;
    if (used instanceof Set && used.has(wordLen)) return { violated: true, reason: "冷眼：该长度已用过" };
    return { violated: false, reason: "" };
  }

  if (slug === "the_mouth") {
    const locked = ctx.mouthLockedLength;
    if (locked != null && Number.isFinite(locked) && wordLen !== locked) {
      return { violated: true, reason: "独口：长度不符" };
    }
    return { violated: false, reason: "" };
  }

  if (slug === "the_club") {
    const key = ctx.clubRequiredKey;
    if (!key) return { violated: false, reason: "" };
    const def = ctx.getWordDefinition ? ctx.getWordDefinition(w) : null;
    const pos = def?.pos;
    if (!dictionaryPosMatchesClubKey(pos, key)) return { violated: true, reason: "棘梅：词性不符" };
    return { violated: false, reason: "" };
  }

  return { violated: false, reason: "" };
}

/**
 * @param {number | null} mouthLockedLength
 * @param {number} wordLen
 * @param {boolean} submitViolated
 */
export function nextMouthLockedLengthAfterSubmit(mouthLockedLength, wordLen, submitViolated) {
  if (submitViolated) return mouthLockedLength;
  if (mouthLockedLength != null) return mouthLockedLength;
  const L = Math.max(0, Math.round(Number(wordLen)) || 0);
  if (L <= 0) return mouthLockedLength;
  return L;
}
