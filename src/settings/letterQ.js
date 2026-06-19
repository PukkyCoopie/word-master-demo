import { getLetterQMode } from "./gameSettings.js";

/** @typedef {import('./gameSettings.js').LetterQMode} LetterQMode */

/** @type {readonly { id: LetterQMode; label: string }[]} */
export const LETTER_Q_MODE_OPTIONS = [
  { id: "qu", label: "Qu" },
  { id: "q", label: "Q" },
];

/**
 * 小写 raw（q 表示 Q/Qu 块）→ 棋盘/牌库展示字母串。
 * @param {unknown} raw
 * @param {LetterQMode} [mode]
 * @returns {string}
 */
export function resolveLetterFromRaw(raw, mode = getLetterQMode()) {
  const r = String(raw ?? "").toLowerCase();
  if (r === "?") return "?";
  if (r === "q" || r === "qu") return mode === "q" ? "Q" : "Qu";
  return r ? r.toUpperCase() : "";
}

/**
 * 已存储的 tile.letter → 当前设置下的展示字母（不影响拼词 raw）。
 * @param {unknown} letter
 * @param {LetterQMode} [mode]
 * @returns {string}
 */
export function normalizeStoredTileLetter(letter, mode = getLetterQMode()) {
  const s = String(letter ?? "");
  if (!s || s === "?") return s;
  const lower = s.toLowerCase();
  if (lower === "q" || lower === "qu") return mode === "q" ? "Q" : "Qu";
  return s;
}

/**
 * 是否使用 Qu 双字宽样式（letter-qu）。
 * @param {unknown} letter
 * @param {LetterQMode} [mode]
 * @returns {boolean}
 */
export function isQuStyleTileLetter(letter, mode = getLetterQMode()) {
  if (mode !== "qu") return false;
  const lower = String(letter ?? "").toLowerCase();
  return lower === "q" || lower === "qu";
}

/** 简介文案中 J/Q/Qu/K 棋类表述用的 Q 标签（随设置 Qu / Q）。 */
export function getLetterQCopyLabel(mode = getLetterQMode()) {
  return resolveLetterFromRaw("q", mode);
}

/**
 * 宝藏简介 text 段：将「J、Qu、K」类写法替换为当前 Q 展示标签（在 polish 大写之前调用）。
 * @param {import('../treasures/treasureDescription.js').TreasureDescSegment[]} segments
 * @returns {import('../treasures/treasureDescription.js').TreasureDescSegment[]}
 */
export function applyLetterQCopyToDescSegments(segments) {
  void getLetterQMode();
  const label = getLetterQCopyLabel();
  /** @type {import('../treasures/treasureDescription.js').TreasureDescSegment[]} */
  const out = [];
  for (const seg of segments) {
    if (seg.type === "text") {
      const v = seg.v.replace(/J、Qu、K/g, `J、${label}、K`);
      out.push(v === seg.v ? seg : { type: "text", v });
    } else if (seg.type === "gainBlock") {
      out.push({ type: "gainBlock", parts: applyLetterQCopyToDescSegments(seg.parts) });
    } else {
      out.push(seg);
    }
  }
  return out;
}
