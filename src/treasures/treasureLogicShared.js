/** 相邻字母块是否为同一字母（小写比较，含 qu 一格） */
export function hasConsecutiveDuplicateLetters(tiles) {
  if (!tiles || tiles.length < 2) return false;
  for (let i = 0; i < tiles.length - 1; i++) {
    const a = String(tiles[i]?.letter ?? "").toLowerCase();
    const b = String(tiles[i + 1]?.letter ?? "").toLowerCase();
    if (a.length > 0 && a === b) return true;
  }
  return false;
}

/** 是否存在某字母出现次数 >= 3 */
export function hasTripleLetterCount(tiles) {
  const m = new Map();
  for (const t of tiles ?? []) {
    const k = String(t?.letter ?? "").toLowerCase();
    if (!k) continue;
    const n = (m.get(k) || 0) + 1;
    m.set(k, n);
    if (n >= 3) return true;
  }
  return false;
}

/** 单词无重复字母（各格 letter 去重后数量等于词长） */
export function hasAllUniqueLetters(tiles) {
  const letters = (tiles ?? []).map((t) => String(t?.letter ?? "").toLowerCase()).filter(Boolean);
  return letters.length > 0 && new Set(letters).size === letters.length;
}

export function distinctRarityCount(letterParts) {
  const s = new Set();
  for (const p of letterParts ?? []) {
    if (p?.rarity) s.add(p.rarity);
  }
  return s.size;
}

export function allUniformRarity(letterParts) {
  const parts = letterParts ?? [];
  if (parts.length === 0) return false;
  const r0 = parts[0].rarity;
  return parts.every((p) => p.rarity === r0);
}

export function buildTreasureLogicConditions(tiles, letterParts) {
  return {
    streakOk: hasConsecutiveDuplicateLetters(tiles),
    tripleOk: hasTripleLetterCount(tiles),
    uniqueOk: hasAllUniqueLetters(tiles),
    threeRaritiesOk: distinctRarityCount(letterParts) >= 3,
    uniformOk: allUniformRarity(letterParts),
    shortWordOk: (tiles?.length ?? 0) > 0 && tiles.length <= 3,
  };
}
