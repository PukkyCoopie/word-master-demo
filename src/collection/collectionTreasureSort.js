import { LETTER_RARITY_ORDER } from "../composables/useScoring.js";
import { resolveTreasureIntroducedVersion } from "../treasures/treasureCatalog.js";
import { treasureHasCollectionPrerequisite } from "./collectionEntryState.js";

const RARITY_RANK = Object.freeze(
  Object.fromEntries(LETTER_RARITY_ORDER.map((r, i) => [r, i])),
);

const RARITY_GROUP_LABEL = Object.freeze({
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
});

/** @typedef {'rarity' | 'price' | 'version'} TreasureCollectionGroupBy */

/** @type {Readonly<Record<TreasureCollectionGroupBy, TreasureCollectionGroupBy>>} */
export const TREASURE_COLLECTION_GROUP_BY = Object.freeze({
  rarity: "rarity",
  price: "price",
  version: "version",
});

/** 未写 `collectionOrder` 时落在该基数之后，便于用 0、10、20… 插入自定义序 */
const DEFAULT_COLLECTION_ORDER_BASE = 1_000_000;

/**
 * @param {string | null | undefined} rarity
 */
function raritySortKey(rarity) {
  const r = String(rarity ?? "rare").trim();
  return RARITY_RANK[r] ?? RARITY_RANK.rare;
}

/**
 * @param {string} version
 * @returns {[number, number, number]}
 */
function parseIntroducedVersion(version) {
  const parts = String(version ?? "")
    .trim()
    .split(".")
    .map((n) => Math.max(0, Math.floor(Number(n) || 0)));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * @param {string} a
 * @param {string} b
 */
function compareIntroducedVersion(a, b) {
  const va = parseIntroducedVersion(a);
  const vb = parseIntroducedVersion(b);
  for (let i = 0; i < 3; i += 1) {
    if (va[i] !== vb[i]) return va[i] - vb[i];
  }
  return 0;
}

/**
 * @param {{ treasureId: string, collectionOrder?: number }} row
 */
function catalogCollectionOrderKey(row) {
  const n = Number(row.collectionOrder);
  if (Number.isFinite(n)) return n;
  return DEFAULT_COLLECTION_ORDER_BASE + Number(row.treasureId);
}

/**
 * @param {readonly { treasureId: string, collectionOrder?: number }[]} rows
 * @param {(id: string) => { rarity?: string, price?: number } | null | undefined} getDef
 */
export function sortTreasureCatalogRows(rows, getDef) {
  return [...rows].sort((a, b) => {
    const defA = getDef(a.treasureId);
    const defB = getDef(b.treasureId);
    const ra = raritySortKey(defA?.rarity);
    const rb = raritySortKey(defB?.rarity);
    if (ra !== rb) return ra - rb;
    const pa = treasureHasCollectionPrerequisite(a.treasureId) ? 1 : 0;
    const pb = treasureHasCollectionPrerequisite(b.treasureId) ? 1 : 0;
    if (pa !== pb) return pa - pb;
    const oa = catalogCollectionOrderKey(a);
    const ob = catalogCollectionOrderKey(b);
    if (oa !== ob) return oa - ob;
    return Number(a.treasureId) - Number(b.treasureId);
  });
}

/**
 * @param {{ treasureId: string }} row
 * @param {(id: string) => { rarity?: string, price?: number } | null | undefined} getDef
 * @param {TreasureCollectionGroupBy} groupBy
 */
function treasureGroupKey(row, getDef, groupBy) {
  const def = getDef(row.treasureId);
  if (groupBy === TREASURE_COLLECTION_GROUP_BY.price) {
    return String(Math.max(0, Math.floor(Number(def?.price) || 0)));
  }
  if (groupBy === TREASURE_COLLECTION_GROUP_BY.version) {
    return resolveTreasureIntroducedVersion(row.treasureId);
  }
  return String(def?.rarity ?? "rare");
}

/**
 * @param {string} keyA
 * @param {string} keyB
 * @param {TreasureCollectionGroupBy} groupBy
 */
function compareTreasureGroupKeys(keyA, keyB, groupBy) {
  if (groupBy === TREASURE_COLLECTION_GROUP_BY.rarity) {
    return raritySortKey(keyA) - raritySortKey(keyB);
  }
  if (groupBy === TREASURE_COLLECTION_GROUP_BY.price) {
    return Number(keyA) - Number(keyB);
  }
  if (groupBy === TREASURE_COLLECTION_GROUP_BY.version) {
    return compareIntroducedVersion(keyB, keyA);
  }
  return 0;
}

/**
 * @param {string} key
 * @param {TreasureCollectionGroupBy} groupBy
 */
export function formatTreasureCollectionGroupLabel(key, groupBy) {
  if (groupBy === TREASURE_COLLECTION_GROUP_BY.rarity) {
    return RARITY_GROUP_LABEL[key] ?? key;
  }
  if (groupBy === TREASURE_COLLECTION_GROUP_BY.price) {
    return `$${key}`;
  }
  if (groupBy === TREASURE_COLLECTION_GROUP_BY.version) {
    return `v${key}`;
  }
  return key;
}

/**
 * @param {readonly { treasureId: string, collectionOrder?: number }[]} rows
 * @param {(id: string) => { rarity?: string, price?: number } | null | undefined} getDef
 * @param {TreasureCollectionGroupBy} groupBy
 * @returns {{ key: string, label: string, rows: { treasureId: string, collectionOrder?: number }[] }[]}
 */
export function groupTreasureCatalogRows(rows, getDef, groupBy) {
  /** @type {Map<string, { treasureId: string, collectionOrder?: number }[]>} */
  const buckets = new Map();
  for (const row of rows) {
    const key = treasureGroupKey(row, getDef, groupBy);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(row);
    else buckets.set(key, [row]);
  }
  return [...buckets.entries()]
    .sort(([keyA], [keyB]) => compareTreasureGroupKeys(keyA, keyB, groupBy))
    .map(([key, groupRows]) => ({
      key,
      label: formatTreasureCollectionGroupLabel(key, groupBy),
      rows: sortTreasureCatalogRows(groupRows, getDef),
    }));
}

/**
 * @param {readonly { treasureId: string, collectionOrder?: number }[]} catalog
 * @param {(id: string) => { rarity?: string, price?: number } | null | undefined} getDef
 * @param {{ groupView?: boolean, groupBy?: TreasureCollectionGroupBy }} [options]
 * @returns {string[]}
 */
export function getCollectionTreasureNavIds(catalog, getDef, options = {}) {
  const groupView = options.groupView === true;
  const groupBy = options.groupBy ?? TREASURE_COLLECTION_GROUP_BY.rarity;
  const sorted = sortTreasureCatalogRows(catalog, getDef);
  if (!groupView) return sorted.map((row) => row.treasureId);
  return groupTreasureCatalogRows(sorted, getDef, groupBy).flatMap((group) =>
    group.rows.map((row) => row.treasureId),
  );
}
