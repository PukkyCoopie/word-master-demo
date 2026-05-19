import { iterTreasureHookContributions } from "../game/treasureBlueprintMirror.js";
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
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
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
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
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
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
    const v = TREASURE_HOOKS_BY_ID.get(tid)?.getLetterRarityMultAdd?.(hookCtx);
    total += Number(v) || 0;
  }
  return total;
}

/**
 * 逐字母稀有度倍率乘法连乘（各宝藏 `getLetterRarityMultMulForLetterPart`；含 replay 轮次）。
 * @param {import('./treasureTypes.js').TreasureLogicContext} hookCtx
 * @param {number[] | null} [replayCounts]
 */
export function productLetterRarityMultMulFromSlots(hookCtx, replayCounts = null) {
  const slots = hookCtx.ownedSlotTreasureIds ?? [];
  const parts = hookCtx.letterParts ?? [];
  let product = 1;
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.getLetterRarityMultMulForLetterPart;
    if (!fn) continue;
    for (let i = 0; i < parts.length; i++) {
      const perLetter = Number(fn(parts[i], hookCtx)) || 1;
      if (perLetter <= 1) continue;
      const triggers = replayCounts
        ? 1 + Math.max(0, Math.floor(Number(replayCounts[i]) || 0))
        : 1;
      for (let t = 0; t < triggers; t += 1) product *= perLetter;
    }
  }
  return product;
}
