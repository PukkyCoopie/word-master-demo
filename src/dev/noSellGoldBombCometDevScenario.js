import { ACCESSORY_NO_SELL } from "../accessories/accessoryCatalog.js";

export const GOLD_MEDAL_TREASURE_ID = "67";
export const BOMB_TREASURE_ID = "29";
export const COMET_TREASURE_ID = "45";
export const NO_SELL_GOLD_BOMB_COMET_DEV_QUERY = "noSellGoldBombComet";

/**
 * @param {() => number} [rng]
 */
export function isNoSellGoldBombCometDevScenario(rng) {
  void rng;
  if (!import.meta.env.DEV) return false;
  return (
    new URLSearchParams(globalThis.location?.search ?? "").get("dev") ===
    NO_SELL_GOLD_BOMB_COMET_DEV_QUERY
  );
}

/**
 * 开局 [禁售金牌][禁售炸弹][彗星]（仅两侧为禁售，便于测炸弹邻槽真/假摧毁）。
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function applyNoSellGoldBombCometOwnedTreasures(ownedTreasuresRef, buildOwnedTreasureSlot) {
  ownedTreasuresRef.value = [
    buildOwnedTreasureSlot({
      treasureId: GOLD_MEDAL_TREASURE_ID,
      treasureAccessoryIds: [ACCESSORY_NO_SELL],
    }),
    buildOwnedTreasureSlot({
      treasureId: BOMB_TREASURE_ID,
      treasureAccessoryIds: [ACCESSORY_NO_SELL],
    }),
    buildOwnedTreasureSlot({ treasureId: COMET_TREASURE_ID }),
  ];
}
