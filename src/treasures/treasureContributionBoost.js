import { iterTreasureHookContributions } from "../game/treasureBlueprintMirror.js";
import { TREASURE_HOOKS_BY_ID } from "./treasureRegistry.js";

/**
 * @param {{ multMul?: number } | null | undefined} step
 */
export function isMeaningfulTreasureBoostStep(step) {
  const multMul = Number(step?.multMul) || 0;
  return multMul > 1;
}

/**
 * 某宝藏贡献（字后/逐字）后，由其它已装备宝藏（如奖杯）追加的倍率步。
 * @param {import('./treasureTypes.js').TreasureLogicContext} hookCtx
 * @param {(string | null | undefined)[]} slots
 * @param {{ treasureId: string, slotIndex: number }} target
 * @returns {import('./treasureTypes.js').TreasurePostStep | null}
 */
export function collectAfterTreasureContributionBoostStep(hookCtx, slots, target) {
  for (const { treasureId: providerId, source } of iterTreasureHookContributions(slots)) {
    if (source === "blueprint") continue;
    const boost = TREASURE_HOOKS_BY_ID.get(providerId)?.buildAfterTreasureContributionBoostStep?.(
      hookCtx,
      target,
    );
    if (isMeaningfulTreasureBoostStep(boost)) return boost;
  }
  return null;
}

/**
 * @param {{ treasureId: string, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number, moneyAdd?: number }[]} steps
 * @param {import('./treasureTypes.js').TreasureLogicContext} hookCtx
 * @param {(string | null | undefined)[]} slots
 * @param {string} treasureId
 * @param {number} slotIndex
 * @param {boolean} contributed
 */
export function appendPostLetterContributionBoostSteps(
  steps,
  hookCtx,
  slots,
  treasureId,
  slotIndex,
  contributed,
) {
  if (!contributed) return;
  const boost = collectAfterTreasureContributionBoostStep(hookCtx, slots, {
    treasureId,
    slotIndex,
  });
  if (!isMeaningfulTreasureBoostStep(boost)) return;
  steps.push({ treasureId, slotIndex, ...boost });
}

/**
 * 逐字贡献路径上的奖杯等倍率连乘（与 `submitScoringAnim` 逐宝藏步序对齐）。
 * @param {import('./treasureTypes.js').TreasureLogicContext} hookCtx
 * @param {(string | null | undefined)[]} slots
 * @param {{ letter?: string, rarity?: string }[]} letterParts
 * @param {number[]} scoringVisitCountsByLetter
 */
export function productAllPerLetterContributionBoostMult(
  hookCtx,
  slots,
  letterParts,
  scoringVisitCountsByLetter,
) {
  let product = 1;
  for (const { treasureId: providerId, source } of iterTreasureHookContributions(slots)) {
    if (source === "blueprint") continue;
    const fn = TREASURE_HOOKS_BY_ID.get(providerId)?.productPerLetterContributionBoostMult;
    if (!fn) continue;
    const partial = Number(fn(hookCtx, { letterParts, scoringVisitCountsByLetter })) || 1;
    if (partial > 1) product *= partial;
  }
  return product;
}
