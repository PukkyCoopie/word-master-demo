/**
 * 计分板 / 回形针等写在牌张上的持久平面分、倍率（`tileScoreBonus` / `letterMultBonus`）。
 */

/** @param {unknown} card */
export function deckCardHasPersistedIntrinsicGain(card) {
  if (!card || typeof card !== "object") return false;
  const c = /** @type {{ tileScoreBonus?: unknown, letterMultBonus?: unknown }} */ (card);
  if (Math.floor(Number(c.tileScoreBonus) || 0) !== 0) return true;
  if (Math.floor(Number(c.letterMultBonus) || 0) !== 0) return true;
  return false;
}
