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
 * @param {{ translation_zh?: string | null } | null | undefined} def
 * @returns {{ lines: string[]; previewLine: string; extraCount: number }}
 */
export function buildWordDefinitionPreview(def) {
  const lines = parseTranslationLines(def?.translation_zh);
  const previewLine = lines[0] ?? "";
  const extraCount = Math.max(0, lines.length - 1);
  return { lines, previewLine, extraCount };
}
