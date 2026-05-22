/**
 * 提交入口前半段：从有效词槽读取并解析单词。
 * @param {{ buildParts: () => { word?: string } | null | undefined, resolveWord: (parts: unknown) => string }} deps
 * @returns {{ parts: any, wordPattern: string, resolvedWord: string } | { error: 'empty' | 'invalid' }}
 */
export function resolveSubmitWordInput({ buildParts, resolveWord }) {
  const parts = buildParts?.();
  const wordPattern = String(parts?.word ?? "");
  if (!wordPattern) return { error: "empty" };
  const resolvedWord = String(resolveWord?.(parts) ?? "");
  if (!resolvedWord) return { error: "invalid" };
  return { parts, wordPattern, resolvedWord };
}
