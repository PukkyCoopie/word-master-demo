import { ensureTreasureBank } from "./treasureRunState.js";

/** 购入宝藏槽后初始化运行时银行/计数 */
export function initTreasureBankOnAcquire(treasureId, runState) {
  if (!runState) return;
  const id = String(treasureId);
  switch (id) {
    case "60":
      ensureTreasureBank(runState, id).multAdd = 30;
      break;
    case "62":
      ensureTreasureBank(runState, id).multMul = 2;
      break;
    case "64":
      runState.extraLetterScoreWordsRemaining = 10;
      break;
    case "104":
      // 镜子：再次购入须从 0/2 重新累计（卖出后 banks 仍保留旧进度）
      ensureTreasureBank(runState, id).scoreAdd = 0;
      break;
    case "122":
      ensureTreasureBank(runState, id).posPackProgress = 3;
      break;
    case "132":
      ensureTreasureBank(runState, id).scoreAdd = 1;
      break;
    default:
      break;
  }
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
 * 同步「升级免费」运行态，避免在面板层写 110 的字面量分支。
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('./treasureRunState.js').TreasureRunState} runState
 */
export function syncShopUpgradesFreeFromOwnedTreasures(ownedSlotTreasureIds, runState) {
  if (!runState) return;
  runState.shopUpgradesFree = (ownedSlotTreasureIds ?? []).some((id) => String(id ?? "") === "110");
}
