import { createDefaultTreasureBank, ensureGlobalTreasureBank, isGlobalTreasureBank } from "./treasureRunState.js";

/**
 * 购入宝藏槽后初始化运行时银行/计数。
 * @param {string} treasureId
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {Record<string, unknown> | null | undefined} [ownedSlot] 新获得的宝藏实例（非全局银行宝藏必填）
 */
export function initTreasureBankOnAcquire(treasureId, runState, ownedSlot = null) {
  if (!runState && !ownedSlot) return;
  const id = String(treasureId);
  /** @type {import('./treasureRunState.js').TreasureIdBank} */
  const bank = createDefaultTreasureBank();
  switch (id) {
    case "60":
      bank.multAdd = 30;
      break;
    case "62":
      bank.multMul = 2;
      break;
    case "64":
      bank.scoreAdd = 10;
      break;
    case "104":
      bank.scoreAdd = 0;
      break;
    case "122":
      bank.posPackProgress = 3;
      break;
    case "132":
      bank.scoreAdd = 1;
      break;
    default:
      break;
  }
  if (isGlobalTreasureBank(id)) {
    if (!runState) return;
    const globalBank = ensureGlobalTreasureBank(runState, id);
    Object.assign(globalBank, bank);
    return;
  }
  if (!ownedSlot) return;
  ownedSlot.bank = bank;
}

/**
 * @param {string} treasureId
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {number} slotIndex
 * @param {object[]} ownedTreasureInstances
 */
export function initTreasureBankOnAcquireAtSlot(treasureId, runState, slotIndex, ownedTreasureInstances) {
  const slot = ownedTreasureInstances?.[slotIndex];
  initTreasureBankOnAcquire(treasureId, runState, slot && typeof slot === "object" ? slot : null);
}

/**
 * 宝藏购入后的即时副作用（不涉及计分与钩子编排）。
 * @param {string} treasureId
 * @param {{ addRemainingRemovals?: (n: number) => void, treasureRun?: import('./treasureRunState.js').TreasureRunState }} [ctx]
 */
export function applyTreasureAcquireImmediateEffects(treasureId, ctx = {}) {
  const id = String(treasureId ?? "");
  if (id === "42") ctx.addRemainingRemovals?.(4);
  if (id === "110" && ctx.treasureRun) ctx.treasureRun.shopUpgradesFree = true;
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('./treasureRunState.js').TreasureRunState} runState
 */
export function syncShopUpgradesFreeFromOwnedTreasures(ownedSlotTreasureIds, runState) {
  if (!runState) return;
  runState.shopUpgradesFree = (ownedSlotTreasureIds ?? []).some((id) => String(id ?? "") === "110");
}
