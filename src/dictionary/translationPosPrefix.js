/** 词性缩写（行首或嵌入 ECDICT 屈折说明后） */
export const POS_PREFIX_TOKEN =
  "n|v|vi|vt|adj|adv|a|prep|conj|pron|num|art|interj|aux|det|abbr";

const LINE_START_POS_RE = new RegExp(`^(${POS_PREFIX_TOKEN})\\.(?:\\s|$)`, "i");
const EMBEDDED_POS_RE = new RegExp(`\\b(${POS_PREFIX_TOKEN})\\.`, "i");
const LEADING_POS_RE = new RegExp(`^(${POS_PREFIX_TOKEN})\\.\\s+`, "i");
const INFLECTION_POS_PREFIX_ERR_RE = new RegExp(
  `^(?:(?:${POS_PREFIX_TOKEN})\\.\\s+)+(\\([^)]+\\))\\s+(?=(?:${POS_PREFIX_TOKEN})\\.)`,
  "i",
);

/**
 * 行首或行内是否已有词性前缀（如 «(bane 的复数) n. 祸根»）。
 * @param {string | null | undefined} line
 */
export function translationLineHasPosPrefix(line) {
  const trimmed = String(line ?? "").trimStart();
  if (!trimmed) return false;
  if (LINE_START_POS_RE.test(trimmed)) return true;
  return EMBEDDED_POS_RE.test(trimmed);
}

/**
 * 去掉方案 A 误加在屈折说明前的词性，如 «n. (bane 的复数) n. …» → «(bane 的复数) n. …»。
 * @param {string | null | undefined} text
 */
export function stripErroneousPosBeforeInflectionGloss(text) {
  return String(text ?? "").replace(INFLECTION_POS_PREFIX_ERR_RE, "$1 ");
}

/**
 * 合并行首重复词性，如 «n. n. 祸根» → «n. 祸根»。
 * @param {string | null | undefined} text
 */
export function collapseDuplicateLeadingPosPrefix(text) {
  let s = String(text ?? "").trimStart();
  for (let guard = 0; guard < 6; guard++) {
    const m1 = s.match(LEADING_POS_RE);
    if (!m1) break;
    const rest = s.slice(m1[0].length);
    if (!LEADING_POS_RE.test(rest)) break;
    const m2 = rest.match(LEADING_POS_RE);
    if (!m2) break;
    s = m1[0] + rest.slice(m2[0].length);
  }
  return s.replace(/\s{2,}/g, " ").trim();
}

/**
 * 寻呼机等 UI：去括号后合并重复行首词性。
 * @param {string | null | undefined} text
 */
export function normalizeTranslationSnippetForDisplay(text) {
  return collapseDuplicateLeadingPosPrefix(text);
}

/**
 * 构建期：修正单行释义中的词性冗余。
 * @param {string} line
 */
export function repairTranslationLinePosArtifacts(line) {
  return collapseDuplicateLeadingPosPrefix(stripErroneousPosBeforeInflectionGloss(line));
}
