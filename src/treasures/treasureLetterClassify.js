const VOWEL_SET = new Set(["a", "e", "i", "o", "u"]);

function normalizeLetter(letter) {
  return String(letter ?? "").toLowerCase();
}

function hasTreasure(ownedSlotTreasureIds, treasureId) {
  const slots = Array.isArray(ownedSlotTreasureIds) ? ownedSlotTreasureIds : [];
  return slots.some((id) => id === treasureId);
}

/**
 * 30：所有字母额外视为元音；31：所有字母额外视为辅音。
 * 与自然分类叠加，不互相取消；二者同持时同一字母可同时计元音与辅音。
 */
export function isVowelLetterWithMask(letter, ownedSlotTreasureIds) {
  if (hasTreasure(ownedSlotTreasureIds, "30")) return true;
  return VOWEL_SET.has(normalizeLetter(letter));
}

export function isConsonantLetterWithMask(letter, ownedSlotTreasureIds) {
  if (hasTreasure(ownedSlotTreasureIds, "31")) return true;
  return !VOWEL_SET.has(normalizeLetter(letter));
}

export function countMatchedLetters(letterParts, predicate) {
  let count = 0;
  for (const p of letterParts ?? []) {
    if (predicate(normalizeLetter(p?.letter ?? ""))) count += 1;
  }
  return count;
}
