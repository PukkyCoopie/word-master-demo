import { getLetterQMode } from "../settings/gameSettings.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import { slotPatternAlignsWithResolvedWord } from "./quSlotSubmitPattern.js";

/** 与 {@link import("../composables/useScoring.js").isWildcardMaterialTile} 一致，避免循环依赖。 */
export function isWildcardQuestionTile(tile) {
  return Boolean(
    tile?.isWildcard === true ||
      tile?.materialId === "wildcard" ||
      String(tile?.letter ?? "").trim() === "?",
  );
}

/**
 * Qu 模式下整词拼满所需万能块槽位数（`q`+`u` 占 1 槽；Q 单字模式与词长相同）。
 * @param {string} word
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 */
export function countWildcardSlotsForWord(word, mode = getLetterQMode()) {
  const w = String(word ?? "").toLowerCase();
  let slots = 0;
  for (let i = 0; i < w.length; i += 1) {
    if (mode === "qu" && w[i] === "q" && w[i + 1] === "u") {
      slots += 1;
      i += 1;
    } else {
      slots += 1;
    }
  }
  return slots;
}

/**
 * pattern 中 `?` 的个数。
 * @param {string} pattern
 * @param {string} [wildcardChar]
 */
export function countWildcardCharsInPattern(pattern, wildcardChar = "?") {
  let n = 0;
  const raw = String(pattern ?? "");
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === wildcardChar) n += 1;
  }
  return n;
}

/**
 * Qu 模式：万能 pattern 与候选整词按槽位对齐（`?`+`qu` 首字母对 1 槽 2 字）。
 * @param {string} pattern
 * @param {string} candidate
 * @param {string} [wildcardChar]
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 */
export function candidateMatchesWildcardPattern(
  pattern,
  candidate,
  wildcardChar = "?",
  mode = getLetterQMode(),
) {
  const p = String(pattern ?? "").toLowerCase();
  const c = String(candidate ?? "").toLowerCase();
  if (mode !== "qu") {
    if (p.length !== c.length) return false;
    for (let i = 0; i < p.length; i += 1) {
      if (p[i] === wildcardChar) continue;
      if (p[i] !== c[i]) return false;
    }
    return true;
  }

  let pi = 0;
  let ci = 0;
  while (pi < p.length && ci < c.length) {
    if (p[pi] === wildcardChar) {
      if (c[ci] === "q" && c[ci + 1] === "u") {
        pi += 1;
        ci += 2;
      } else {
        pi += 1;
        ci += 1;
      }
      continue;
    }
    if (p[pi] !== c[ci]) return false;
    pi += 1;
    ci += 1;
  }
  return pi === p.length && ci === c.length;
}

/**
 * 拼词 pattern（槽位串）与已解析整词是否对齐（等长、Qu 槽位可变宽、或 Qu 万能槽位对齐）。
 * @param {string} pattern
 * @param {string | null | undefined} resolved
 * @param {string} [wildcardChar]
 * @param {boolean[] | null | undefined} [quSlotMask]
 */
export function patternAlignsWithResolvedWord(
  pattern,
  resolved,
  wildcardChar = "?",
  quSlotMask = null,
) {
  const p = String(pattern ?? "");
  const r = String(resolved ?? "").toLowerCase();
  if (!p || !r) return false;
  if (quSlotMask?.some(Boolean)) {
    return slotPatternAlignsWithResolvedWord(p, r, quSlotMask, wildcardChar);
  }
  if (p.length === r.length) return true;
  return candidateMatchesWildcardPattern(p, r, wildcardChar, "qu");
}

/**
 * 从已解析整词为单个万能块 `?` 读取展示/计分 raw，并返回下一读指针。
 * @param {string} res
 * @param {number} readPos
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 */
export function readWildcardRawFromResolved(res, readPos, mode = getLetterQMode()) {
  const ch = res[readPos];
  if (!ch || ch < "a" || ch > "z") {
    return { raw: null, nextReadPos: readPos + 1 };
  }
  if (mode === "qu" && ch === "q" && res[readPos + 1] === "u") {
    return { raw: "q", nextReadPos: readPos + 2 };
  }
  return { raw: ch, nextReadPos: readPos + 1 };
}

/**
 * 按拼词 tile 顺序推进整词读指针（非万能块按 letter 片段长度）。
 * @param {object | null | undefined} tile
 * @param {string} res
 * @param {number} readPos
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 */
export function advanceResolvedReadPosPastTile(tile, res, readPos, mode = getLetterQMode()) {
  const frag = String(tile?.letter ?? "").toLowerCase();
  if (isWildcardQuestionTile(tile) && frag === "?") {
    return readWildcardRawFromResolved(res, readPos, mode).nextReadPos;
  }
  return readPos + frag.length;
}

/**
 * @param {object | null | undefined} tile
 * @param {string} res
 * @param {number} readPos
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 */
export function resolveWildcardTileFromResolved(tile, res, readPos, mode = getLetterQMode()) {
  const frag = String(tile?.letter ?? "").toLowerCase();
  if (!isWildcardQuestionTile(tile) || frag !== "?") {
    return { raw: null, letter: null, nextReadPos: readPos + frag.length };
  }
  const hit = readWildcardRawFromResolved(res, readPos, mode);
  return {
    raw: hit.raw,
    letter: hit.raw ? resolveLetterFromRaw(hit.raw, mode) : null,
    nextReadPos: hit.nextReadPos,
  };
}

/** @param {object | null | undefined} tile */
function isSubmitScoringAppendTempTile(tile) {
  return tile?.isNewspaperTempTile === true;
}

/**
 * 拼词 pattern（可含 `?`）与各格 letter 逐位对齐；pattern 中 `?` 由 tile 上已解析字母填充。
 * @param {string | null | undefined} pattern
 * @param {readonly object[] | null | undefined} tiles
 * @returns {string}
 */
function alignWildcardPatternWithTileLetters(pattern, tiles) {
  const p = String(pattern ?? "").toLowerCase();
  const list = (tiles ?? []).filter((t) => t && !isSubmitScoringAppendTempTile(t));
  if (!p || list.length === 0) return "";
  let out = "";
  let ti = 0;
  for (let pi = 0; pi < p.length; pi += 1) {
    const tile = list[ti];
    if (!tile) return "";
    const frag = String(tile?.letter ?? "").toLowerCase();
    if (p[pi] === "?") {
      if (!frag || frag === "?") return "";
      out += frag;
      ti += 1;
      continue;
    }
    if (frag === "?") return "";
    if (frag.length !== 1 || frag !== p[pi]) return "";
    out += frag;
    ti += 1;
  }
  return ti === list.length ? out : "";
}

/**
 * 按拼词顺序 + 词典整词，将各格 letter 拼成钩子用字符串（万能 `?` 按整词写回真实字母）。
 * @param {readonly object[] | null | undefined} tiles
 * @param {string | null | undefined} resolvedWord
 * @returns {string}
 */
export function buildWordFromTilesAgainstResolved(tiles, resolvedWord) {
  const res = String(resolvedWord ?? "").toLowerCase().trim();
  const list = (tiles ?? []).filter((t) => t && !isSubmitScoringAppendTempTile(t));
  if (!res || list.length === 0) return res;
  let readPos = 0;
  let out = "";
  for (const tile of list) {
    const frag = String(tile?.letter ?? "").toLowerCase();
    if (isWildcardQuestionTile(tile) && frag === "?") {
      const { raw, nextReadPos } = readWildcardRawFromResolved(res, readPos);
      readPos = nextReadPos;
      if (raw) out += raw;
      continue;
    }
    out += frag;
    readPos = advanceResolvedReadPosPastTile(tile, res, readPos);
  }
  return out;
}

/**
 * 提交成功宝藏钩子用的整词：优先词典解析词；缺省或含 `?` 时按 tile 与整词对齐写回万能块。
 * @param {string | null | undefined} resolvedWord
 * @param {readonly object[] | null | undefined} [tiles]
 * @returns {string}
 */
export function resolveSubmittedWordForHooks(resolvedWord, tiles = null) {
  const raw = String(resolvedWord ?? "").toLowerCase().trim();
  const list = (tiles ?? []).filter((t) => t && !isSubmitScoringAppendTempTile(t));
  if (raw && !raw.includes("?")) return raw;

  if (raw && raw.includes("?") && list.length) {
    const fromPattern = alignWildcardPatternWithTileLetters(raw, list);
    if (fromPattern && !fromPattern.includes("?")) return fromPattern;
  }

  if (raw && !raw.includes("?") && list.length) {
    const aligned = buildWordFromTilesAgainstResolved(list, raw);
    if (aligned && !aligned.includes("?")) return aligned;
  }

  const joined = list.map((t) => String(t?.letter ?? "").toLowerCase()).join("");
  if (joined && !joined.includes("?")) return joined;

  return raw || joined;
}
