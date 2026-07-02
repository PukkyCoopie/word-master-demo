/** 棘梅 Boss 词性匹配（无重依赖，提示与提交共用） */

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
