/**
 * 剪贴板 / 回形针等写在格与 `_deckCard` 上的「固定」平面分、倍率角标。
 * 法术改字母、材质、稀有度、万能等时，应在突变后写回，避免牌张与格短暂不同步或后续路径盖掉。
 */

/**
 * @param {unknown} tile
 * @returns {{ sb: number, mb: number }}
 */
export function snapshotMaxIntrinsicGainsFromTile(tile) {
  if (!tile || typeof tile !== "object") return { sb: 0, mb: 0 };
  const sbT = Math.max(0, Math.floor(Number(/** @type {{ tileScoreBonus?: unknown }} */ (tile).tileScoreBonus) || 0));
  const mbT = Math.max(0, Math.round(Number(/** @type {{ letterMultBonus?: unknown }} */ (tile).letterMultBonus) || 0));
  const c = /** @type {{ tileScoreBonus?: unknown, letterMultBonus?: unknown } | null} */ (
    /** @type {{ _deckCard?: unknown }} */ (tile)._deckCard
  );
  const sbC =
    c && typeof c === "object" ? Math.max(0, Math.floor(Number(c.tileScoreBonus) || 0)) : 0;
  const mbC =
    c && typeof c === "object" ? Math.max(0, Math.round(Number(c.letterMultBonus) || 0)) : 0;
  return { sb: Math.max(sbT, sbC), mb: Math.max(mbT, mbC) };
}

/**
 * @param {unknown} tile
 * @param {{ sb: number, mb: number }} gains
 */
export function applyIntrinsicGainsToTileAndLinkedCard(tile, gains) {
  if (!tile || typeof tile !== "object") return;
  const sb = Math.max(0, Math.floor(Number(gains?.sb) || 0));
  const mb = Math.max(0, Math.round(Number(gains?.mb) || 0));
  /** @type {{ tileScoreBonus?: number, letterMultBonus?: number }} */
  const t = tile;
  t.tileScoreBonus = sb;
  t.letterMultBonus = mb;
  const c = /** @type {{ tileScoreBonus?: number, letterMultBonus?: number } | null} */ (
    /** @type {{ _deckCard?: unknown }} */ (tile)._deckCard
  );
  if (c && typeof c === "object") {
    c.tileScoreBonus = sb;
    c.letterMultBonus = mb;
  }
}
