import { getLetterCase } from "./gameSettings.js";

/** @typedef {import('./gameSettings.js').LetterCase} LetterCase */

/** @type {readonly { id: LetterCase; label: string }[]} */
export const LETTER_CASE_OPTIONS = [
  { id: "uppercase", label: "大写" },
  { id: "lowercase", label: "小写" },
];

/**
 * 字母块展示串（不影响拼词/计分逻辑）。
 * @param {unknown} letter
 * @param {LetterCase} [caseMode]
 * @returns {string}
 */
export function formatTileLetterDisplay(letter, caseMode = getLetterCase()) {
  const s = String(letter ?? "");
  if (!s || s === "?") return s;
  return caseMode === "lowercase" ? s.toLowerCase() : s;
}
