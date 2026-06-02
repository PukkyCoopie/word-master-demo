import {
  UPGRADE_LENGTH_GROUPS,
  UPGRADE_RARITY_LETTER_LABEL,
  buildLengthUpgradeShopRow,
  buildRarityUpgradeShopRow,
} from "../shop/shopOfferRowBuilders.js";

/** @type {() => number} */
let catalogOfferInstanceSeq = 0;

/** @returns {import('../shop/shopOfferRowBuilders.js').ReturnType<typeof buildLengthUpgradeShopRow>[]} */
function buildCollectionUpgradeCatalog() {
  /** @type {ReturnType<typeof buildLengthUpgradeShopRow>[]} */
  const rows = [];
  for (const g of UPGRADE_LENGTH_GROUPS) {
    rows.push(buildLengthUpgradeShopRow(() => ++catalogOfferInstanceSeq, g));
  }
  for (const rk of Object.keys(UPGRADE_RARITY_LETTER_LABEL)) {
    rows.push(buildRarityUpgradeShopRow(() => ++catalogOfferInstanceSeq, rk));
  }
  return rows;
}

/** 商店可售升级全集（长度组 + 四稀有度），顺序与掷货一致 */
export const COLLECTION_UPGRADE_CATALOG = Object.freeze(buildCollectionUpgradeCatalog());

export const COLLECTION_LENGTH_UPGRADE_CATALOG = Object.freeze(
  COLLECTION_UPGRADE_CATALOG.filter((o) => o.upgradeKind === "length"),
);

export const COLLECTION_RARITY_UPGRADE_CATALOG = Object.freeze(
  COLLECTION_UPGRADE_CATALOG.filter((o) => o.upgradeKind === "rarity"),
);

export const COLLECTION_UPGRADE_TOTAL = COLLECTION_UPGRADE_CATALOG.length;

/**
 * @param {string} groupKey
 */
export function getUpgradeTreasureIdForLengthGroupKey(groupKey) {
  const key = String(groupKey ?? "").trim();
  return key ? `upgrade_${key}` : "";
}

/**
 * @param {string} rarityKey
 */
export function getUpgradeTreasureIdForRarityKey(rarityKey) {
  const rk = String(rarityKey ?? "").trim();
  return rk ? `upgrade_rarity_${rk}` : "";
}

/**
 * @param {number} len
 */
export function findLengthGroupKeyForWordLen(len) {
  const L = Math.max(3, Math.min(16, Math.round(Number(len) || 0)));
  for (const g of UPGRADE_LENGTH_GROUPS) {
    if (L >= g.minLen && L <= g.maxLen) return g.key;
  }
  return null;
}

/**
 * @param {number} len
 */
export function getUpgradeTreasureIdForWordLen(len) {
  const key = findLengthGroupKeyForWordLen(len);
  return key ? getUpgradeTreasureIdForLengthGroupKey(key) : "";
}

/**
 * @param {{ kind: "rarity", rk: string } | { kind: "length", g: { key?: string } }} pick
 */
export function getUpgradeTreasureIdForRandomPick(pick) {
  if (!pick || typeof pick !== "object") return "";
  if (pick.kind === "rarity") return getUpgradeTreasureIdForRarityKey(pick.rk);
  const key = pick.g?.key;
  return key ? getUpgradeTreasureIdForLengthGroupKey(key) : "";
}

/** @type {ReadonlySet<string>} */
export const COLLECTION_UPGRADE_TREASURE_IDS = Object.freeze(
  new Set(COLLECTION_UPGRADE_CATALOG.map((o) => String(o.treasureId ?? ""))),
);

/**
 * @param {string} treasureId
 */
export function buildCollectionUpgradePreview(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!COLLECTION_UPGRADE_TREASURE_IDS.has(id)) return null;
  for (const g of UPGRADE_LENGTH_GROUPS) {
    if (`upgrade_${g.key}` === id) {
      return buildLengthUpgradeShopRow(() => ++catalogOfferInstanceSeq, g);
    }
  }
  for (const rk of Object.keys(UPGRADE_RARITY_LETTER_LABEL)) {
    if (`upgrade_rarity_${rk}` === id) {
      return buildRarityUpgradeShopRow(() => ++catalogOfferInstanceSeq, rk);
    }
  }
  return null;
}
