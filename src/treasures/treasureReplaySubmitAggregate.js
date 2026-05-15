import { TREASURE_HOOKS_BY_ID } from "./treasureRegistry.js";

/**
 * 汇总各槽位宝藏对「逐字母 + replay」提交分的加减分（逻辑在各 `treasure_*.js` 的 accumulateReplaySubmitAdjustments）。
 * @param {{ letterParts: object[], ownedSlotTreasureIds: (string|null|undefined)[], replayCounts: number[] }} ctx
 * @returns {{ flatScoreAdd: number, flatMultAdd: number }}
 */
export function aggregateReplaySubmitAdjustments(ctx) {
  const slots = ctx.ownedSlotTreasureIds ?? [];
  let flatScoreAdd = 0;
  let flatMultAdd = 0;
  for (const tid of slots) {
    if (tid == null || tid === "") continue;
    const adj = TREASURE_HOOKS_BY_ID.get(tid)?.accumulateReplaySubmitAdjustments?.(ctx);
    if (!adj) continue;
    flatScoreAdd += Number(adj.scoreAdd) || 0;
    flatMultAdd += Number(adj.multAdd) || 0;
  }
  return { flatScoreAdd, flatMultAdd };
}

/**
 * replay 时：某字母位置上，所有已装备宝藏贡献的「稀有度类」倍率增量之和（各宝藏 `getLetterRarityMultDeltaForLetterPart`）。
 * @param {(string|null|undefined)[]} ownedSlotTreasureIds
 * @param {{ letter?: string, rarity?: string }} part
 */
export function sumLetterRarityMultDeltaForLetterPart(ownedSlotTreasureIds, part) {
  const slots = ownedSlotTreasureIds ?? [];
  let d = 0;
  for (const tid of slots) {
    if (tid == null || tid === "") continue;
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.getLetterRarityMultDeltaForLetterPart;
    if (fn) d += Number(fn(part)) || 0;
  }
  return d;
}

/**
 * 已装备宝藏的「整词稀有度倍率」加法总和（各宝藏 `getLetterRarityMultAdd`）。
 * @param {import('./treasureTypes.js').TreasureLogicContext} hookCtx
 */
export function sumLetterRarityMultAddFromSlots(hookCtx) {
  const slots = hookCtx.ownedSlotTreasureIds ?? [];
  let total = 0;
  for (const tid of slots) {
    if (tid == null || tid === "") continue;
    const v = TREASURE_HOOKS_BY_ID.get(tid)?.getLetterRarityMultAdd?.(hookCtx);
    total += Number(v) || 0;
  }
  return total;
}
