import { LETTER_RARITY_ORDER } from "../composables/useScoring.js";
import { treasureHasCollectionPrerequisite } from "./collectionEntryState.js";

const RARITY_RANK = Object.freeze(
  Object.fromEntries(LETTER_RARITY_ORDER.map((r, i) => [r, i])),
);

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
 * @param {{ treasureId: string, collectionOrder?: number }} row
 */
function catalogCollectionOrderKey(row) {
  const n = Number(row.collectionOrder);
  if (Number.isFinite(n)) return n;
  return DEFAULT_COLLECTION_ORDER_BASE + Number(row.treasureId);
}

/**
 * @param {readonly { treasureId: string, collectionOrder?: number }[]} rows
 * @param {(id: string) => { rarity?: string } | null | undefined} getDef
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
