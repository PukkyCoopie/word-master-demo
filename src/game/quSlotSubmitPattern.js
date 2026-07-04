/** Qu 模式：Q 族块占 1 词槽，拼词 pattern 与整词对齐时可匹配 1 或 2 字母（qu）。 */

import { deckCardRaw } from "./deckCardSync.js";
import { getLetterQMode } from "../settings/gameSettings.js";
import { isQFamilyDisplayLetter } from "../settings/letterQ.js";
import { letterSubstituteNeighborTrio } from "./vowelNeighborSubstitute.js";

/** 与万能块判定一致：牌张 raw 可能仍为变万能前的 q，不能据此当 Qu 槽。 */
function isWildcardSubmitTile(tile) {
  if (tile?.isWildcard === true || tile?.materialId === "wildcard") return true;
  if (String(tile?.letter ?? "").trim() === "?") return true;
  const card = tile?._deckCard;
  return Boolean(card && typeof card === "object" && card.isWildcard === true);
}

/**
 * @param {object | null | undefined} tile
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 */
export function isQuModeSubmitQFamilyTile(tile, mode = getLetterQMode()) {
  if (mode !== "qu" || !tile?.letter) return false;
  if (isWildcardSubmitTile(tile)) return false;
  const card = tile._deckCard;
  if (card && typeof card === "object") {
    return deckCardRaw(card) === "q";
  }
  return isQFamilyDisplayLetter(tile.letter);
}

/**
 * Qu 模式 Q 族块在拼词 pattern 中只贡献自然字母 q（1 槽 1 字），非 Qu 双字展开。
 * @param {object | null | undefined} tile
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 * @returns {string}
 */
export function submitPatternCharFromTile(tile, mode = getLetterQMode()) {
  if (!tile?.letter) return "";
  if (isQuModeSubmitQFamilyTile(tile, mode)) return "q";
  const frag = String(tile.letter ?? "").toLowerCase();
  if (frag === "?") return "?";
  return frag.charAt(0) || "";
}

/** @param {boolean[] | null | undefined} quSlotMask */
export function countQuSlotsInMask(quSlotMask) {
  if (!quSlotMask?.length) return 0;
  let n = 0;
  for (const b of quSlotMask) if (b) n += 1;
  return n;
}

/** @param {boolean[] | null | undefined} quSlotMask */
export function patternHasQuSlots(quSlotMask) {
  return countQuSlotsInMask(quSlotMask) > 0;
}

/**
 * @param {{ prev: string | null, self: string, next: string | null } | null} trio
 * @param {string} ch
 */
function letterInMouthTrio(trio, ch) {
  if (!trio) return false;
  return ch === trio.self || ch === trio.prev || ch === trio.next;
}

/** Qu 模式：任意万能 `?` 可占整词中的 `qu` 双字（与词典 {@link candidateMatchesWildcardPattern} 一致）。 */
function advanceCandidateIndexPastWildcard(c, ci, mode) {
  if (mode === "qu" && c[ci] === "q" && c[ci + 1] === "u") return ci + 2;
  return ci + 1;
}

/**
 * 槽位 pattern 与候选整词对齐（无嘴 trio 时按字面 / qu 双字宽）。
 * @param {string} pattern
 * @param {string} candidate
 * @param {boolean[]} quSlotMask
 * @param {string} [wildcardChar]
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 */
export function slotPatternAlignsWithCandidate(
  pattern,
  candidate,
  quSlotMask,
  wildcardChar = "?",
  mode = getLetterQMode(),
) {
  const p = String(pattern ?? "").toLowerCase();
  const c = String(candidate ?? "").toLowerCase();
  let pi = 0;
  let ci = 0;
  while (pi < p.length) {
    const isQuSlot = quSlotMask[pi] === true && mode === "qu";
    if (p[pi] === wildcardChar) {
      pi += 1;
      ci = advanceCandidateIndexPastWildcard(c, ci, mode);
      continue;
    }
    if (isQuSlot) {
      if (p[pi] === "q" && c[ci] === "q" && c[ci + 1] === "u") {
        pi += 1;
        ci += 2;
        continue;
      }
      if (p[pi] !== c[ci]) return false;
      pi += 1;
      ci += 1;
      continue;
    }
    if (p[pi] !== c[ci]) return false;
    pi += 1;
    ci += 1;
  }
  return pi === p.length && ci === c.length;
}

/**
 * 嘴邻位 + Qu 槽：某槽可匹配 trio 单字或 qu 双字（仅 natural q 且 trio.self 含 q）。
 * @param {string} pattern
 * @param {string} candidate
 * @param {boolean[]} quSlotMask
 * @param {(import("./vowelNeighborSubstitute.js").LetterSubstituteTrio | null)[]} mouthTrios
 * @param {string} [wildcardChar]
 * @param {import("../settings/gameSettings.js").LetterQMode} [mode]
 */
export function candidateMatchesMouthSlotPattern(
  pattern,
  candidate,
  quSlotMask,
  mouthTrios,
  wildcardChar = "?",
  mode = getLetterQMode(),
) {
  const p = String(pattern ?? "").toLowerCase();
  const c = String(candidate ?? "").toLowerCase();
  let pi = 0;
  let ci = 0;
  while (pi < p.length) {
    const trio = mouthTrios[pi] ?? null;
    const isQuSlot = quSlotMask[pi] === true && mode === "qu";

    if (p[pi] === wildcardChar) {
      pi += 1;
      ci = advanceCandidateIndexPastWildcard(c, ci, mode);
      continue;
    }

    if (isQuSlot) {
      if (trio && trio.self === "q" && c[ci] === "q" && c[ci + 1] === "u") {
        pi += 1;
        ci += 2;
        continue;
      }
      if (trio) {
        if (!letterInMouthTrio(trio, c[ci])) return false;
        pi += 1;
        ci += 1;
        continue;
      }
      if (p[pi] === "q" && c[ci] === "q" && c[ci + 1] === "u") {
        pi += 1;
        ci += 2;
        continue;
      }
      if (p[pi] !== c[ci]) return false;
      pi += 1;
      ci += 1;
      continue;
    }

    if (trio) {
      if (!letterInMouthTrio(trio, c[ci])) return false;
    } else if (p[pi] !== c[ci]) {
      return false;
    }
    pi += 1;
    ci += 1;
  }
  return pi === p.length && ci === c.length;
}

/**
 * @param {string} pattern
 * @param {string | null | undefined} resolved
 * @param {boolean[]} quSlotMask
 * @param {string} [wildcardChar]
 */
export function slotPatternAlignsWithResolvedWord(
  pattern,
  resolved,
  quSlotMask,
  wildcardChar = "?",
) {
  const r = String(resolved ?? "").toLowerCase();
  if (!pattern || !r) return false;
  return slotPatternAlignsWithCandidate(pattern, r, quSlotMask, wildcardChar);
}

/**
 * 预计算各槽嘴 trio（与等长 slot pattern 对齐）。
 * @param {string} pattern
 * @param {boolean[]} vowelAltMask
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 */
export function buildMouthTriosForSlotPattern(pattern, vowelAltMask, ownedSlotTreasureIds = []) {
  const len = pattern.length;
  /** @type {(import("./vowelNeighborSubstitute.js").LetterSubstituteTrio | null)[]} */
  const trios = [];
  for (let i = 0; i < len; i += 1) {
    if (!vowelAltMask[i]) {
      trios.push(null);
      continue;
    }
    trios.push(letterSubstituteNeighborTrio(pattern[i], ownedSlotTreasureIds));
  }
  return trios;
}

/**
 * 拼词 parts 与已解析整词是否对齐（含 Qu 槽 + 嘴邻位）。
 * @param {{ word: string, vowelAltMask?: boolean[], quSlotMask?: boolean[] }} parts
 * @param {string | null | undefined} resolved
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 * @param {string} [wildcardChar]
 */
export function submitPartsAlignWithResolved(
  parts,
  resolved,
  ownedSlotTreasureIds = [],
  wildcardChar = "?",
) {
  const pattern = String(parts?.word ?? "");
  const res = String(resolved ?? "").toLowerCase();
  if (!pattern || !res) return false;
  const quSlotMask = parts.quSlotMask ?? [];
  if (!patternHasQuSlots(quSlotMask)) {
    if (pattern.length === res.length) return true;
    return slotPatternAlignsWithCandidate(pattern, res, quSlotMask, wildcardChar);
  }
  const vowelAltMask = parts.vowelAltMask ?? [];
  const mouthTrios = buildMouthTriosForSlotPattern(pattern, vowelAltMask, ownedSlotTreasureIds);
  return candidateMatchesMouthSlotPattern(pattern, res, quSlotMask, mouthTrios, wildcardChar);
}
