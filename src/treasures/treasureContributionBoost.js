import {
  ownedHasTrophyInSlots,
  trophyBoostMultForOwnedTreasureId,
} from "./items/treasure_138.js";

/**
 * @param {(string | null | undefined)[]} slots
 * @param {(string | null | undefined)[] | undefined} fallbackSlots
 */
function resolveOwnedSlotsForTrophyBoost(slots, fallbackSlots) {
  const row = slots ?? fallbackSlots ?? [];
  return Array.isArray(row) ? row : [];
}

/**
 * @param {{ multMul?: number } | null | undefined} step
 */
export function isMeaningfulTreasureBoostStep(step) {
  const multMul = Number(step?.multMul) || 0;
  return multMul > 1;
}

/**
 * 计分阶段：栏内每个史诗/传说宝藏（不含奖杯）各追加一次奖杯倍率步，与是否本手触发无关。
 * @param {{ treasureId: string, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number, moneyAdd?: number, trophyContributionBoost?: boolean }[]} steps
 * @param {import('./treasureTypes.js').TreasureLogicContext} hookCtx
 * @param {(string | null | undefined)[]} slots
 * @param {string} treasureId
 * @param {number} slotIndex
 */
export function appendOwnedSlotTrophyBoostStep(steps, hookCtx, slots, treasureId, slotIndex) {
  const slotRow = resolveOwnedSlotsForTrophyBoost(slots, hookCtx?.ownedSlotTreasureIds);
  if (!ownedHasTrophyInSlots(slotRow)) return;
  const multMul = trophyBoostMultForOwnedTreasureId(treasureId);
  if (!multMul) return;
  steps.push({
    treasureId,
    slotIndex,
    multMul,
    trophyContributionBoost: true,
    trophyOwnedSlotBoost: true,
  });
}

/** @param {number} slotIndex @param {string} treasureId */
export function ownedSlotTrophyAnimKey(slotIndex, treasureId) {
  return `${Math.floor(Number(slotIndex) || 0)}:${String(treasureId ?? "").trim()}`;
}

/**
 * @param {{ treasureId: string, slotIndex: number, multAdd?: number, scoreAdd?: number, multMul?: number, moneyAdd?: number, trophyContributionBoost?: boolean }[]} steps
 * @param {import('./treasureTypes.js').TreasureLogicContext} hookCtx
 * @param {(string | null | undefined)[]} slots
 * @param {string} treasureId
 * @param {number} slotIndex
 * @param {boolean} _contributed
 */
export function appendPostLetterContributionBoostSteps(
  steps,
  hookCtx,
  slots,
  treasureId,
  slotIndex,
  _contributed,
) {
  appendOwnedSlotTrophyBoostStep(steps, hookCtx, slots, treasureId, slotIndex);
}
