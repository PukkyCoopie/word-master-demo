/** 牌库牌张是否具「增益」（材质或配饰） */

/** @param {unknown} card */
export function deckCardHasEnhancement(card) {
  if (!card || typeof card !== "object") return false;
  const c = /** @type {{ materialId?: string | null, accessoryId?: string | null }} */ (card);
  const mat = String(c.materialId ?? "").trim();
  const acc = String(c.accessoryId ?? "").trim();
  return !!mat || !!acc;
}

/** @param {readonly unknown[] | null | undefined} deck */
export function countDeckCardsWithEnhancement(deck) {
  let n = 0;
  for (const c of deck ?? []) {
    if (deckCardHasEnhancement(c)) n += 1;
  }
  return n;
}
