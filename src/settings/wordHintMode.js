/** @typedef {'hidden' | 'ripple' | 'autoSelect'} WordHintMode */

/** @type {readonly { id: WordHintMode; label: string }[]} */
export const WORD_HINT_MODE_OPTIONS = Object.freeze([
  { id: "hidden", label: "关闭" },
  { id: "ripple", label: "提示" },
  { id: "autoSelect", label: "自动选中" },
]);

const WORD_HINT_MODE_IDS = new Set(WORD_HINT_MODE_OPTIONS.map((o) => o.id));

/** @param {unknown} value @returns {WordHintMode} */
export function normalizeWordHintMode(value) {
  const s = String(value ?? "");
  return WORD_HINT_MODE_IDS.has(/** @type {WordHintMode} */ (s))
    ? /** @type {WordHintMode} */ (s)
    : "autoSelect";
}

/** @returns {boolean} */
export function isWordHintAutoSelectMode(mode) {
  return normalizeWordHintMode(mode) === "autoSelect";
}
