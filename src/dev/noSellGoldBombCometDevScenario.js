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
 * 开局 [金牌][炸弹][彗星]，各带禁售配饰（金牌用尽次数过关测试等）。
 * @param {import('vue').Ref<(object | null)[]>} ownedTreasuresRef
 * @param {(input: Record<string, unknown>) => object} buildOwnedTreasureSlot
 */
export function applyNoSellGoldBombCometOwnedTreasures(ownedTreasuresRef, buildOwnedTreasureSlot) {
  ownedTreasuresRef.value = [GOLD_MEDAL_TREASURE_ID, BOMB_TREASURE_ID, COMET_TREASURE_ID].map(
    (treasureId) =>
      buildOwnedTreasureSlot({
        treasureId,
        treasureAccessoryIds: [ACCESSORY_NO_SELL],
      }),
  );
}
