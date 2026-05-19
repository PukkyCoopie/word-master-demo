import { describe, mult, score } from "./treasureDescription.js";
import { ensureTreasureBank } from "./treasureRunState.js";

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 */
export function getMultAddBank(runState, treasureId) {
  if (!runState) return 0;
  return ensureTreasureBank(runState, treasureId).multAdd;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 */
export function getMultMulBank(runState, treasureId) {
  if (!runState) return 1;
  const m = ensureTreasureBank(runState, treasureId).multMul;
  return m > 0 ? m : 1;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 */
export function getScoreAddBank(runState, treasureId) {
  if (!runState) return 0;
  return ensureTreasureBank(runState, treasureId).scoreAdd;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} delta
 */
export function addMultAddBank(runState, treasureId, delta) {
  if (!runState) return;
  ensureTreasureBank(runState, treasureId).multAdd += Number(delta) || 0;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} factor
 */
export function multiplyMultMulBank(runState, treasureId, factor) {
  if (!runState) return;
  const f = Number(factor);
  if (!Number.isFinite(f) || f <= 0) return;
  ensureTreasureBank(runState, treasureId).multMul *= f;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} delta
 */
export function addScoreAddBank(runState, treasureId, delta) {
  if (!runState) return;
  ensureTreasureBank(runState, treasureId).scoreAdd += Number(delta) || 0;
}

/**
 * @param {string} treasureId
 * @param {'multAdd' | 'multMul' | 'scoreAdd'} band
 * @param {string} [zeroLabel]
 */
export function patchCurrentBankDescription(treasureId, band, zeroLabel = "+0") {
  return {
    patchDescription(ctx) {
      const rs = ctx.treasureRun;
      if (!rs) return null;
      if (band === "multAdd") {
        const v = Math.round(getMultAddBank(rs, treasureId));
        return describe("（当前", mult(v >= 0 ? `+${v}` : String(v)), "）");
      }
      if (band === "scoreAdd") {
        const v = Math.round(getScoreAddBank(rs, treasureId));
        return describe("（当前", score(v >= 0 ? `+${v}` : String(v)), "）");
      }
      const v = getMultMulBank(rs, treasureId);
      const shown = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
      return describe("（当前", mult(`x${shown || "1"}`), "）");
    },
  };
}
