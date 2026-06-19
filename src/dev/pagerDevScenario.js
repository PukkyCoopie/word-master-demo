export const PAGER_TREASURE_ID = "118";
export const PAGER_DEV_QUERY = "pager";

/**
 * @param {() => number} [rng]
 */
export function isPagerDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? "").get("dev") === PAGER_DEV_QUERY;
}

/**
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function applyPagerOwnedTreasure(ownedTreasuresRef, buildOwnedTreasureSlot) {
  const slots = [...ownedTreasuresRef.value];
  if (slots.length === 0) slots.push(null);
  slots[0] = buildOwnedTreasureSlot({ treasureId: PAGER_TREASURE_ID });
  ownedTreasuresRef.value = slots;
}
