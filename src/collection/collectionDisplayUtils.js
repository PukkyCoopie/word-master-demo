/** 收藏页未解锁条目的占位名称 */
export const COLLECTION_UNKNOWN_LABEL = "???";

/** 未解锁条目视觉透明度（与入场动画终点一致，避免 GSAP 写到 1 盖掉样式） */
export const COLLECTION_UNKNOWN_OPACITY = 0.55;

/** 有出现前提、尚未发现的宝藏：介于未解锁与已解锁之间 */
export const COLLECTION_PREREQUISITE_OPACITY = 0.78;

/** 收藏图鉴未解锁详情预览层（不论有无前置，统一透明度） */
export const COLLECTION_LOCKED_PREVIEW_OPACITY = 0.75;

const COLLECTION_UPGRADE_LIST_NAME_PREFIX = "升级 · ";

/** 收藏升级 tab 格子上方名称（去掉「升级 · 」，详情层仍用商店全名） */
export function collectionUpgradeGridListName(fullName) {
  const s = String(fullName ?? "").trim();
  if (s.startsWith(COLLECTION_UPGRADE_LIST_NAME_PREFIX)) {
    return s.slice(COLLECTION_UPGRADE_LIST_NAME_PREFIX.length).trim() || s;
  }
  return s;
}

const COLLECTION_UNKNOWN_ENTER_CLASS_NAMES = Object.freeze([
  "collection-shop-cell--unknown",
  "collection-shop-cell--preview-revealed",
  "collection-shop-cell--prerequisite-locked",
  "collection-voucher-cell--unknown",
  "collection-voucher-cell--preview-revealed",
  "collection-material-row--unknown",
  "collection-material-row--preview-revealed",
  "collection-accessory-row--unknown",
  "collection-accessory-row--preview-revealed",
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
  if (!(el instanceof HTMLElement)) return 1;
  if (el.classList.contains("collection-shop-cell--prerequisite-locked")) {
    return COLLECTION_PREREQUISITE_OPACITY;
  }
  if (
    el.classList.contains("collection-shop-cell--preview-revealed") ||
    el.classList.contains("collection-voucher-cell--preview-revealed") ||
    el.classList.contains("collection-material-row--preview-revealed") ||
    el.classList.contains("collection-accessory-row--preview-revealed")
  ) {
    return COLLECTION_LOCKED_PREVIEW_OPACITY;
  }
  return isCollectionUnknownEnterTarget(el) ? COLLECTION_UNKNOWN_OPACITY : 1;
}

/** @param {string | null | undefined} rarity */
export function gemClassForTreasureRarity(rarity) {
  if (rarity === "epic") return "gem-epic";
  if (rarity === "legendary") return "gem-legendary";
  if (rarity === "common") return "gem-common";
  return "gem-rare";
}
