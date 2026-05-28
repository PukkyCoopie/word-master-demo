const VOWEL_SET = new Set(["a", "e", "i", "o", "u"]);

function normalizeLetter(letter) {
  return String(letter ?? "").toLowerCase();
}

function hasTreasure(ownedSlotTreasureIds, treasureId) {
  const slots = Array.isArray(ownedSlotTreasureIds) ? ownedSlotTreasureIds : [];
  return slots.some((id) => id === treasureId);
}

/**
 * 30：所有字母视为元音；31：所有字母视为辅音。
 * 二者同时存在时各自仍生效（同一字母可同时计元音与辅音）；仅单独持有时另一方走自然分类。
 */
export function isVowelLetterWithMask(letter, ownedSlotTreasureIds) {
  if (hasTreasure(ownedSlotTreasureIds, "30")) return true;
  if (hasTreasure(ownedSlotTreasureIds, "31")) return false;
  return VOWEL_SET.has(normalizeLetter(letter));
}

export function isConsonantLetterWithMask(letter, ownedSlotTreasureIds) {
  if (hasTreasure(ownedSlotTreasureIds, "31")) return true;
  if (hasTreasure(ownedSlotTreasureIds, "30")) return false;
  return !VOWEL_SET.has(normalizeLetter(letter));
}

export function countMatchedLetters(letterParts, predicate) {
  let count = 0;
  for (const p of letterParts ?? []) {
    if (predicate(normalizeLetter(p?.letter ?? ""))) count += 1;
  }
  return count;
}
