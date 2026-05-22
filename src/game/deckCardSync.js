const WILDCARD_MATERIAL_ID = "wildcard";

/** 棋盘/牌库展示：字母显示串 -> 小写 raw（q 表示 Qu） */
function tileLetterToRawLowerForDeck(letter) {
  const L = String(letter ?? "").trim().toLowerCase();
  if (!L) return "";
  return L === "qu" ? "q" : L.charAt(0);
}

/**
 * 字母块配饰互斥：同一牌张/格子最多保留一种配饰（普通配饰优先）。
 * @param {unknown} accessoryId
 * @param {unknown} treasureAccessoryId
 */
function normalizeExclusiveTileAccessoryPair(accessoryId, treasureAccessoryId) {
  const acc = accessoryId != null ? String(accessoryId).trim() : "";
  const tAcc = treasureAccessoryId != null ? String(treasureAccessoryId).trim() : "";
  if (acc) return { accessoryId: acc, treasureAccessoryId: null };
  if (tAcc) return { accessoryId: null, treasureAccessoryId: tAcc };
  return { accessoryId: null, treasureAccessoryId: null };
}

/** @param {unknown} card */
export function deckCardRaw(card) {
  if (!card || typeof card !== "object") return "";
  const r = /** @type {{ raw?: string }} */ (card).raw;
  let raw = String(r ?? "").toLowerCase();
  if (raw === "qu") raw = "q";
  return raw.slice(0, 1) || "";
}

/**
 * 将棋盘格当前展示状态写回其绑定的牌张（用于法术、材质、饰品等持久化）。
 * @param {Record<string, unknown> | null | undefined} tile
 */
export function syncTileStateToDeckCard(tile) {
  const c = /** @type {Record<string, unknown> | null | undefined} */ (tile?._deckCard);
  if (!c || typeof c !== "object") return;
  if (tile.isWildcard === true) {
    c.isWildcard = true;
    c.materialId = WILDCARD_MATERIAL_ID;
  } else {
    c.isWildcard = false;
    const lr = tileLetterToRawLowerForDeck(tile.letter);
    if (lr && lr !== "?") c.raw = lr === "qu" ? "q" : lr.slice(0, 1);
    c.materialId = tile.materialId != null ? String(tile.materialId) : null;
  }
  c.rarity = String(tile?.rarity || "common");
  c.materialScoreBonus = Math.max(0, Math.floor(Number(tile?.materialScoreBonus) || 0));
  c.materialMultBonus = Number(tile?.materialMultBonus) || 0;
  c.tileScoreBonus = Math.max(0, Math.floor(Number(tile?.tileScoreBonus) || 0));
  c.letterMultBonus = Math.max(0, Math.round(Number(tile?.letterMultBonus) || 0));
  const normalizedAccessory = normalizeExclusiveTileAccessoryPair(tile?.accessoryId, tile?.treasureAccessoryId);
  tile.accessoryId = normalizedAccessory.accessoryId;
  tile.treasureAccessoryId = normalizedAccessory.treasureAccessoryId;
  c.accessoryId = normalizedAccessory.accessoryId;
  c.treasureAccessoryId = normalizedAccessory.treasureAccessoryId;
}
