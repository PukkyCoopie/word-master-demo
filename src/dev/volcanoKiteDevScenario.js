export const VOLCANO_TREASURE_ID = "54";
export const KITE_TREASURE_ID = "119";
export const VOLCANO_KITE_DEV_QUERY = "volcanoKite";

/**
 * @param {() => number} [rng]
 */
export function isVolcanoKiteDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return new URLSearchParams(globalThis.location?.search ?? "").get("dev") === VOLCANO_KITE_DEV_QUERY;
}

/**
 * 槽位布局：[风筝, 风筝, 火山, 风筝, 风筝]（便于测喷发距离顺序）
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function applyVolcanoKiteOwnedTreasures(ownedTreasuresRef, buildOwnedTreasureSlot) {
  ownedTreasuresRef.value = [
    buildOwnedTreasureSlot({ treasureId: KITE_TREASURE_ID }),
    buildOwnedTreasureSlot({ treasureId: KITE_TREASURE_ID }),
    buildOwnedTreasureSlot({ treasureId: VOLCANO_TREASURE_ID }),
    buildOwnedTreasureSlot({ treasureId: KITE_TREASURE_ID }),
    buildOwnedTreasureSlot({ treasureId: KITE_TREASURE_ID }),
  ];
}
