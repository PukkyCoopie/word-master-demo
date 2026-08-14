/**
 * 字母表后移 1 位（a→b … z→a）；非法 raw 返回 null。
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function nextAlphabetLetterRaw(raw) {
  const r0 = String(raw ?? "").trim().toLowerCase();
  const r = r0 === "qu" ? "q" : r0.slice(0, 1);
  if (!/^[a-z]$/.test(r)) return null;
  if (r === "z") return "a";
  return String.fromCharCode(r.charCodeAt(0) + 1);
}
