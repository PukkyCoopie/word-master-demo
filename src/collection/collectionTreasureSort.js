import { LETTER_RARITY_ORDER } from "../composables/useScoring.js";
import { treasureHasUnlockPrerequisite } from "./collectionEntryState.js";

const RARITY_RANK = Object.freeze(
  Object.fromEntries(LETTER_RARITY_ORDER.map((r, i) => [r, i])),
);

/**
 * @param {string | null | undefined} rarity
 */
function raritySortKey(rarity) {
  const r = String(rarity ?? "rare").trim();
  return RARITY_RANK[r] ?? RARITY_RANK.rare;
}

/**
 * @param {readonly { treasureId: string }[]} rows
 * @param {(id: string) => { rarity?: string } | null | undefined} getDef
 */
export function sortTreasureCatalogRows(rows, getDef) {
  return [...rows].sort((a, b) => {
    const defA = getDef(a.treasureId);
    const defB = getDef(b.treasureId);
    const ra = raritySortKey(defA?.rarity);
    const rb = raritySortKey(defB?.rarity);
    if (ra !== rb) return ra - rb;
    const pa = treasureHasUnlockPrerequisite(a.treasureId) ? 1 : 0;
    const pb = treasureHasUnlockPrerequisite(b.treasureId) ? 1 : 0;
    if (pa !== pb) return pa - pb;
    return Number(a.treasureId) - Number(b.treasureId);
  });
}
