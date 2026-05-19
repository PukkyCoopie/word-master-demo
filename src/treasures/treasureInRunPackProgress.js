import { ensureTreasureBank } from "./treasureRunState.js";

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 */
export function getPosPackProgress(runState, treasureId) {
  if (!runState) return 0;
  return Math.max(0, Math.floor(Number(ensureTreasureBank(runState, treasureId).posPackProgress) || 0));
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} value
 */
export function setPosPackProgress(runState, treasureId, value) {
  if (!runState) return;
  ensureTreasureBank(runState, treasureId).posPackProgress = Math.max(0, Math.floor(Number(value) || 0));
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState} runState
 * @param {string} treasureId
 * @returns {number} 递增后的进度
 */
export function bumpPosPackProgress(runState, treasureId) {
  const next = getPosPackProgress(runState, treasureId) + 1;
  setPosPackProgress(runState, treasureId, next);
  return next;
}
