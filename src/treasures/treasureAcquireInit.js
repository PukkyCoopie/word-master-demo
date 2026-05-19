import { ensureTreasureBank } from "./treasureRunState.js";

/** 购入宝藏槽后初始化运行时银行/计数 */
export function initTreasureBankOnAcquire(treasureId, runState) {
  if (!runState) return;
  const id = String(treasureId);
  switch (id) {
    case "60":
      ensureTreasureBank(runState, id).multAdd = 25;
      break;
    case "62":
      ensureTreasureBank(runState, id).multMul = 2;
      break;
    case "64":
      runState.extraLetterScoreWordsRemaining = 10;
      break;
    default:
      break;
  }
}
