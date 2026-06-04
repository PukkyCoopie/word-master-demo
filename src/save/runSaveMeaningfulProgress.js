import { deserializeAchievementRunState } from "../achievements/achievementRunState.js";
import { deserializeRunMatchStats } from "./runMatchStatsCodec.js";
import { isContinuableRunPhase, normalizeRunSavePhase } from "./runSaveSchema.js";

/**
 * 局内存档是否包含玩家实质操作（非「刚进局就离开」的空白局）。
 * @param {import('./runSavePayload.js').RunSavePayload | null | undefined} payload
 */
export function hasMeaningfulRunProgress(payload) {
  if (!payload || typeof payload !== "object") return false;

  const phase = normalizeRunSavePhase(payload.phase);
  if (!isContinuableRunPhase(phase)) return true;
  if (phase !== "playing") return true;

  if (Math.max(0, Math.floor(Number(payload.levelIndex) || 0)) > 0) return true;
  if (payload.showShop === true || payload.showSettlement === true || payload.showRunEnd === true) {
    return true;
  }

  const stats = deserializeRunMatchStats(payload.runMatchStats);
  if (
    stats.wordsSubmitted > 0 ||
    stats.lettersDiscarded > 0 ||
    stats.shopPurchases > 0 ||
    stats.rerolls > 0
  ) {
    return true;
  }

  if (Array.isArray(payload.spellCastHistory) && payload.spellCastHistory.length > 0) {
    return true;
  }

  const ach = deserializeAchievementRunState(payload.achievementRunState);
  if (ach.discardUsesCount > 0 || ach.moneySpentTotal > 0) return true;
  if (Object.keys(ach.wordsPerLevelId).length > 0) return true;

  return false;
}

/**
 * 已写入本地、但玩家未进行任何实质操作的「空白进行中局」。
 * @param {import('./runSavePayload.js').RunSavePayload | null | undefined} payload
 */
export function isAbandonedFreshRunPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  const phase = normalizeRunSavePhase(payload.phase);
  return isContinuableRunPhase(phase) && !hasMeaningfulRunProgress(payload);
}
