/** 收藏页未解锁条目的占位名称 */
export const COLLECTION_UNKNOWN_LABEL = "???";

/** 未解锁条目视觉透明度（与入场动画终点一致，避免 GSAP 写到 1 盖掉样式） */
export const COLLECTION_UNKNOWN_OPACITY = 0.55;

const COLLECTION_UNKNOWN_ENTER_CLASS_NAMES = Object.freeze([
  "collection-shop-cell--unknown",
  "collection-voucher-cell--unknown",
  "collection-material-row--unknown",
  "collection-accessory-row--unknown",
]);

/**
 * @param {Element | null | undefined} el
 */
export function isCollectionUnknownEnterTarget(el) {
  if (!(el instanceof HTMLElement)) return false;
  return COLLECTION_UNKNOWN_ENTER_CLASS_NAMES.some((name) => el.classList.contains(name));
}

/**
 * @param {Element | null | undefined} el
 */
export function collectionEnterOpacityForTarget(el) {
  return isCollectionUnknownEnterTarget(el) ? COLLECTION_UNKNOWN_OPACITY : 1;
}

/** @param {string | null | undefined} rarity */
export function gemClassForTreasureRarity(rarity) {
  if (rarity === "epic") return "gem-epic";
  if (rarity === "legendary") return "gem-legendary";
  if (rarity === "common") return "gem-common";
  return "gem-rare";
}
