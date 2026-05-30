import { getRarityForLetter } from "../composables/useScoring.js";

/**
 * 牌包 / 商店 deckTile 选项 → LetterTile 展示与飞字快照（与入库后牌张字段对齐）。
 * @param {Record<string, unknown> | null | undefined} offer
 */
export function buildPackDeckOfferLetterTileProps(offer) {
  if (!offer || typeof offer !== "object") return null;
  const type = String(offer.offerType ?? "");
  if (type !== "deckTile" && type !== "deckLetter") return null;

  let raw = String(offer.deckLetterRaw ?? "e").toLowerCase();
  if (raw === "qu") raw = "q";
  if (!/^[a-z]$/.test(raw)) raw = "e";

  const letter = raw === "q" ? "Qu" : raw.toUpperCase();
  const rarityRaw = offer.letterRarity ?? offer.rarity;
  const rarity =
    rarityRaw != null && String(rarityRaw).trim() !== ""
      ? String(rarityRaw)
      : getRarityForLetter(raw);

  let materialId = null;
  if (offer.deckTileMaterialId != null) {
    const mat = String(offer.deckTileMaterialId).trim();
    if (mat) materialId = mat;
  }

  const acc =
    offer.deckTileAccessoryId != null ? String(offer.deckTileAccessoryId).trim() : "";
  const tAcc =
    offer.deckTileTreasureAccessoryId != null
      ? String(offer.deckTileTreasureAccessoryId).trim()
      : "";

  let accessoryId = acc || null;
  let treasureAccessoryId = tAcc || null;
  if (accessoryId) treasureAccessoryId = null;

  const tileScoreBonus = Math.max(
    0,
    Math.floor(Number(offer.deckTileScoreBonus ?? offer.tileScoreBonus) || 0),
  );
  const tileMultBonus = Math.max(
    0,
    Math.round(Number(offer.deckTileMultBonus ?? offer.letterMultBonus) || 0),
  );

  return {
    letter,
    rarity,
    materialId,
    accessoryId,
    treasureAccessoryId,
    tileScoreBonus,
    tileMultBonus,
  };
}

/** @param {Record<string, unknown> | null | undefined} offer */
export function buildPackDeckOfferFlySnapshot(offer) {
  const p = buildPackDeckOfferLetterTileProps(offer);
  if (!p) return null;
  return {
    letter: p.letter,
    rarity: p.rarity,
    materialId: p.materialId,
    accessoryId: p.accessoryId,
    treasureAccessoryId: p.treasureAccessoryId,
    tileScoreBonus: p.tileScoreBonus,
    letterMultBonus: p.tileMultBonus,
  };
}
