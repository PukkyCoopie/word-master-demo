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
 * 当二者同时存在时，保持默认分类（互相抵消，避免全真/全假）。
 */
export function isVowelLetterWithMask(letter, ownedSlotTreasureIds) {
  const forceVowel = hasTreasure(ownedSlotTreasureIds, "30");
  const forceConsonant = hasTreasure(ownedSlotTreasureIds, "31");
  if (forceVowel && !forceConsonant) return true;
  if (forceConsonant && !forceVowel) return false;
  return VOWEL_SET.has(normalizeLetter(letter));
}

export function countMatchedLetters(letterParts, predicate) {
  let count = 0;
  for (const p of letterParts ?? []) {
    if (predicate(normalizeLetter(p?.letter ?? ""))) count += 1;
  }
  return count;
}
