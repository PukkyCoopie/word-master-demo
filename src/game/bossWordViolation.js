import { isBossEffectsSuppressedByTreasures } from "./treasureBossSuppress.js";
import { getRarityForLetter, isWildcardMaterialTile } from "../composables/useScoring.js";

/**
 * Boss 词长 / 词性「软规则」：不挡提交，违规时本手计 0 分（由调用方处理）。
 */

/** 整词判定类 Boss（选词预览与 Boss 条波纹；格级削弱 Boss 不在此列） */
export const BOSS_WHOLE_WORD_SOFT_SLUGS = Object.freeze(
  new Set(["the_psychic", "the_eye", "the_mouth", "the_club", "the_noble_end"]),
);

/** @param {string | null | undefined} slug */
export function bossHasWholeWordSoftRule(slug) {
  return BOSS_WHOLE_WORD_SOFT_SLUGS.has(String(slug ?? ""));
}

/** @typedef {{ key: string, labelZh: string }} BossPosKey */

/** 棘梅可抽取词性（与词典 `pos` 字段做宽松匹配） */
export const BOSS_CLUB_POS_OPTIONS = Object.freeze([
  { key: "n", labelZh: "名词", patterns: [/名/, /^noun$/i, /^n$/i] },
  {
    key: "v",
    labelZh: "动词",
    patterns: [/动/, /^verb$/i, /^v$/i, /^vi$/i, /^vt$/i, /^vbl$/i],
  },
  { key: "adj", labelZh: "形容词", patterns: [/形/, /^adj$/i, /^a$/i, /^adjective$/i] },
]);

/** 与 `build_word_filtered_csv.mjs` 一致的词性缩写（判定前先规范化 token） */
const CLUB_POS_TOKEN_SETS = Object.freeze({
  n: new Set(["n"]),
  v: new Set(["v", "vi", "vt", "vbl"]),
  adj: new Set(["adj", "a"]),
});

/**
 * @param {string | null | undefined} dictPos
 * @returns {string[]}
 */
export function splitDictionaryPosTokens(dictPos) {
  const raw = String(dictPos ?? "").trim();
  if (!raw) return [];
  return raw
    .split("|")
    .map((t) => t.trim().toLowerCase().replace(/\.$/, ""))
    .filter(Boolean);
}

/**
 * 释义首行 `vi.` / `vt.` / `n.` 等前缀（ECDICT 常见写法）
 * @param {string | null | undefined} translationZh
 * @returns {string}
 */
export function inferPosFromTranslationHead(translationZh) {
  const line = String(translationZh ?? "")
    .trim()
    .split(/\\n|\r?\n/)[0]
    .trimStart();
  const m = line.match(/^([A-Za-z]+)\./);
  if (!m) return "";
  return m[1].toLowerCase();
}

/**
 * @param {string} token 已规范化小写、无尾点
 * @param {string} requiredKey `n` | `v` | `adj`
 */
function dictionaryPosTokenMatchesClubKey(token, requiredKey) {
  const allowed = CLUB_POS_TOKEN_SETS[requiredKey];
  if (allowed?.has(token)) return true;
  const opt = BOSS_CLUB_POS_OPTIONS.find((o) => o.key === requiredKey);
  if (!opt) return false;
  return opt.patterns.some((re) => re.test(token));
}

/**
 * @param {string | null | undefined} dictPos
 * @param {string} requiredKey `n` | `v` | `adj`
 * @param {string | null | undefined} [translationZh] 词性缺失或与 pos 不一致时的 fallback
 */
export function dictionaryPosMatchesClubKey(dictPos, requiredKey, translationZh) {
  const tokens = [...splitDictionaryPosTokens(dictPos)];
  const inferred = inferPosFromTranslationHead(translationZh);
  if (inferred) tokens.push(inferred);
  if (!tokens.length) return false;
  return tokens.some((token) => dictionaryPosTokenMatchesClubKey(token, requiredKey));
}

export function getEndingLetterRarityFromTiles(tiles) {
  const list = Array.isArray(tiles) ? tiles : [];
  if (!list.length) return "common";
  return String(list[list.length - 1]?.rarity ?? "common");
}

/**
 * 按拼词顺序 + 已解析整词，取末格稀有度（万能块取解析字母；与提交前 tile 展示一致）。
 * @param {object[] | null | undefined} tiles
 * @param {string | null | undefined} resolvedWord
 */
export function getEndingLetterRarityForResolvedWord(tiles, resolvedWord) {
  const res = String(resolvedWord ?? "").toLowerCase().trim();
  const list = Array.isArray(tiles) ? tiles : [];
  if (!list.length || !res) return "common";
  let pos = 0;
  let lastRarity = "common";
  for (const tile of list) {
    const frag = String(tile?.letter ?? "").toLowerCase();
    const start = pos;
    pos += frag.length;
    if (isWildcardMaterialTile(tile) && frag === "?") {
      const ch = res[start];
      if (ch >= "a" && ch <= "z") lastRarity = getRarityForLetter(ch);
    } else {
      lastRarity = String(tile?.rarity ?? "common");
    }
  }
  return lastRarity;
}

/**
 * @typedef {Object} BossWildcardResolveContext
 * @property {string} slug
 * @property {Set<number>} [usedLengthsThisLevel]
 * @property {number | null} [mouthLockedLength]
 * @property {string | null} [clubRequiredKey]
 * @property {(string | null | undefined)[]} [ownedSlotTreasureIds]
 * @property {(w: string) => { pos?: string, translation_zh?: string } | null | undefined} [getWordDefinition]
 * @property {(resolvedWord: string) => number} [getJudgedWordLen]
 * @property {(resolvedWord: string) => string} [getEndingLetterRarity]
 * @property {object[]} [tiles]
 */

/** @param {BossWildcardResolveContext | null | undefined} ctx */
export function buildBossWildcardResolveCacheKey(ctx) {
  if (!ctx?.slug) return "";
  const used =
    ctx.usedLengthsThisLevel instanceof Set
      ? [...ctx.usedLengthsThisLevel].sort((a, b) => a - b).join(",")
      : "";
  const tiles = Array.isArray(ctx.tiles) ? ctx.tiles : [];
  const last = tiles[tiles.length - 1];
  const endingFp = last
    ? `${String(last.letter ?? "")}:${String(last.rarity ?? "common")}:${isWildcardMaterialTile(last) ? "w" : "f"}`
    : "";
  return `${ctx.slug}|${used}|${ctx.mouthLockedLength ?? ""}|${ctx.clubRequiredKey ?? ""}|${endingFp}|${tiles.length}`;
}

/**
 * 万能块解析：候选词是否满足 Boss 整词软规则（与提交判定一致）。
 * @param {string} candidate
 * @param {BossWildcardResolveContext | null | undefined} ctx
 */
export function candidatePassesBossSoftWordRule(candidate, ctx) {
  if (!ctx?.slug || !bossHasWholeWordSoftRule(ctx.slug)) return true;
  if (isBossEffectsSuppressedByTreasures(ctx.ownedSlotTreasureIds)) return true;
  const w = String(candidate ?? "").toLowerCase().trim();
  if (!w) return false;
  const wordLen =
    typeof ctx.getJudgedWordLen === "function" ? ctx.getJudgedWordLen(w) : Math.max(0, w.length);
  const endingLetterRarity =
    typeof ctx.getEndingLetterRarity === "function"
      ? ctx.getEndingLetterRarity(w)
      : getEndingLetterRarityForResolvedWord(ctx.tiles, w);
  return !evaluateBossSoftWordViolation({
    slug: ctx.slug,
    wordLen,
    resolvedWord: w,
    endingLetterRarity,
    getWordDefinition: ctx.getWordDefinition,
    usedLengthsThisLevel: ctx.usedLengthsThisLevel,
    mouthLockedLength: ctx.mouthLockedLength ?? null,
    clubRequiredKey: ctx.clubRequiredKey ?? null,
    ownedSlotTreasureIds: ctx.ownedSlotTreasureIds,
  }).violated;
}

/**
 * @param {{ slug: string, wordLen: number, resolvedWord: string, endingLetterRarity?: string, getWordDefinition: (w: string) => { pos?: string } | null | undefined, usedLengthsThisLevel: Set<number>, mouthLockedLength: number | null, clubRequiredKey: string | null, ownedSlotTreasureIds?: (string | null | undefined)[] }} ctx
 * @returns {{ violated: boolean, reason: string }}
 */
export function evaluateBossSoftWordViolation(ctx) {
  if (isBossEffectsSuppressedByTreasures(ctx.ownedSlotTreasureIds)) {
    return { violated: false, reason: "" };
  }
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
    if (!dictionaryPosMatchesClubKey(def?.pos, key, def?.translation_zh)) {
      return { violated: true, reason: "棘梅：词性不符" };
    }
    return { violated: false, reason: "" };
  }

  if (slug === "the_noble_end") {
    const endRarity = String(ctx.endingLetterRarity ?? "common");
    if (endRarity === "common") return { violated: true, reason: "末贵：不允许以普通稀有度的字母结尾" };
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
