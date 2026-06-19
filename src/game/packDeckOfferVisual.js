import { getRarityForLetter } from "../composables/useScoring.js";
import { resolveLetterFromRaw } from "../settings/letterQ.js";
import { mountLetterTileClone } from "./mountLetterTileClone.js";

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

  const letter = resolveLetterFromRaw(raw);
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
  const isWildcardMaterial = materialId === "wildcard";

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
    letter: isWildcardMaterial ? "?" : letter,
    rarity: isWildcardMaterial ? "common" : rarity,
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

/**
 * 飞行动画起点/终点框：取较大边作正方形，避免非正方形容器把字母块拉扁。
 * @param {DOMRect | { left: number; top: number; width: number; height: number }} rect
 */
export function normalizeSquareFlyRect(rect) {
  const side = Math.max(rect.width, rect.height, 1);
  return {
    left: rect.left + (rect.width - side) * 0.5,
    top: rect.top + (rect.height - side) * 0.5,
    width: side,
    height: side,
  };
}

/**
 * 字母块商品飞行动画：tile + 价签整列（与货架 / 详情 `shop-deck-offer-product-stack` 一致）。
 * @param {HTMLElement} host
 * @param {Record<string, unknown>} offer
 * @param {{ priceText?: string, priceStruck?: boolean }} [opts]
 * @returns {() => void}
 */
export function mountDeckOfferFlyProductStack(host, offer, opts = {}) {
  host.classList.add("shop-deck-offer-product-stack");
  const snap = buildPackDeckOfferFlySnapshot(offer);
  if (!snap) return () => {};
  const disposeTile = mountLetterTileClone(host, snap, "grid", {
    tileClass: "shop-shelf-letter-tile",
  });
  const priceWrap = document.createElement("div");
  priceWrap.className = "shop-treasure-price";
  priceWrap.setAttribute("aria-hidden", "true");
  const priceInner = document.createElement("div");
  priceInner.className = "shop-treasure-price-inner";
  if (opts.priceStruck) priceInner.classList.add("shop-treasure-price-inner--pack-struck");
  const base = Math.max(0, Math.floor(Number(offer.price) || 0));
  priceInner.textContent = opts.priceText ?? `$${base}`;
  priceWrap.appendChild(priceInner);
  host.appendChild(priceWrap);
  return () => {
    disposeTile();
    host.remove();
  };
}
