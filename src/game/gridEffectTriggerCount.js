import { tileHasRewindAccessory } from "../accessories/accessoryScoring.js";
import { sumTreasureGridEffectTriggerBonus } from "../treasures/treasureRegistry.js";

/**
 * 棋盘格触发型效果（钢材质光环、重播配饰等）单次结算的触发次数。
 * @param {{ accessoryId?: string | null } | null | undefined} tile
 * @param {(string | null | undefined)[]} [ownedSlotTreasureIds]
 */
export function resolveGridEffectTriggerCount(tile, ownedSlotTreasureIds) {
  const base = tileHasRewindAccessory(tile) ? 2 : 1;
  const bonus = sumTreasureGridEffectTriggerBonus(ownedSlotTreasureIds ?? []);
  return base + Math.max(0, Math.floor(Number(bonus) || 0));
}
