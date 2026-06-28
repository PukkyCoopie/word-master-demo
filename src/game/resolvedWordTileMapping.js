import { getLetterQMode } from "../settings/gameSettings.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";

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
 * 拼词 pattern（槽位串）与已解析整词是否对齐（等长或 Qu 万能槽位对齐）。
 * @param {string} pattern
 * @param {string | null | undefined} resolved
 * @param {string} [wildcardChar]
 */
export function patternAlignsWithResolvedWord(pattern, resolved, wildcardChar = "?") {
  const p = String(pattern ?? "");
  const r = String(resolved ?? "").toLowerCase();
  if (!p || !r) return false;
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
