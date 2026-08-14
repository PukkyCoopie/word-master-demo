import { dictionaryPosMatchesClubKey } from "../game/bossClubPos.js";

/**
 * @param {string | null | undefined} translationZh
 * @returns {string[]}
 */
export function parseTranslationLines(translationZh) {
  if (translationZh == null || translationZh === "") return [];
  return String(translationZh)
    .replace(/\\n/g, "\n")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 棘梅等词性 Boss：把匹配目标词性的释义行稳定提到前面（相对顺序不变）。
 * @param {readonly string[]} lines
 * @param {string | null | undefined} preferredPosKey `n` | `v` | `adj`
 * @returns {string[]}
 */
export function reorderTranslationLinesByPreferredPos(lines, preferredPosKey) {
  const key = String(preferredPosKey ?? "").trim();
  if (!key || !Array.isArray(lines) || lines.length < 2) {
    return Array.isArray(lines) ? [...lines] : [];
  }
  /** @type {string[]} */
  const matched = [];
  /** @type {string[]} */
  const rest = [];
  for (const line of lines) {
    if (dictionaryPosMatchesClubKey("", key, line)) matched.push(line);
    else rest.push(line);
  }
  if (!matched.length) return [...lines];
  return matched.concat(rest);
}

/**
 * @param {string | null | undefined} translationZh
 * @param {string | null | undefined} [preferredPosKey]
 * @returns {string[]}
 */
export function parseTranslationLinesPreferringPos(translationZh, preferredPosKey) {
  return reorderTranslationLinesByPreferredPos(parseTranslationLines(translationZh), preferredPosKey);
}

/**
 * @param {{ translation_zh?: string | null } | null | undefined} def
 * @param {{ preferredPosKey?: string | null }} [options]
 * @returns {{ lines: string[]; previewLine: string; extraCount: number }}
 */
export function buildWordDefinitionPreview(def, options) {
  const lines = parseTranslationLinesPreferringPos(def?.translation_zh, options?.preferredPosKey);
  const previewLine = lines[0] ?? "";
  const extraCount = Math.max(0, lines.length - 1);
  return { lines, previewLine, extraCount };
}
