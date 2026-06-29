import { tileHasRewindAccessory } from "../accessories/accessoryScoring.js";
import { sumTreasureGridEffectTriggerBonus } from "../treasures/treasureRegistry.js";

/**
 * 棋盘格触发型效果单次结算的触发次数（加算，非叠乘）。
 * 本体 1 次 + 同格重播配饰 +1 + 电视机等宝藏全局 +N（与格无关，加在每次计数上）。
 * @param {{ accessoryId?: string | null } | null | undefined} tile
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function resolveGridEffectTriggerCount(tile, ownedSlotTreasureIds) {
  let count = 1;
  if (tileHasRewindAccessory(tile)) count += 1;
  count += Math.max(0, Math.floor(Number(sumTreasureGridEffectTriggerBonus(ownedSlotTreasureIds ?? [])) || 0));
  return count;
}
