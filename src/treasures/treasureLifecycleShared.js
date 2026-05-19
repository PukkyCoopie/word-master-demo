import { isVowelLetterWithMask } from "./treasureLetterClassify.js";

/** @param {string} letter */
export function normalizeLetterChar(letter) {
  const raw = String(letter ?? "").toLowerCase();
  if (raw === "qu" || raw === "q") return "q";
  return raw.length ? raw[0] : "";
}

/** @param {{ letter?: string }[]} letters @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function countVowelsInDiscardBatch(letters, ownedSlotTreasureIds) {
  let n = 0;
  for (const p of letters ?? []) {
    const ch = normalizeLetterChar(p?.letter);
    if (ch && isVowelLetterWithMask(ch, ownedSlotTreasureIds)) n += 1;
  }
  return n;
}

/** @param {string} levelId */
export function parseChapterFromLevelId(levelId) {
  const parts = String(levelId ?? "1-1").split("-");
  return Math.max(1, Math.floor(Number(parts[0])) || 1);
}
