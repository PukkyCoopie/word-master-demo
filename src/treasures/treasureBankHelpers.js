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
 * 累加倍率银行 + 宝藏槽 wobble / +n 倍率气泡。
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, playOwnedTreasureMultDeltaFx?: (id: string, delta: number) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} delta
 */
export async function bankMultAddGain(ctx, treasureId, delta) {
  addMultAddBank(ctx.treasureRun, treasureId, delta);
  await ctx.playOwnedTreasureMultDeltaFx?.(treasureId, delta);
}

/**
 * 累加分数银行 + 宝藏槽 wobble / +n 分气泡。
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, playOwnedTreasureScoreDeltaFx?: (id: string, delta: number) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} delta
 */
export async function bankScoreAddGain(ctx, treasureId, delta) {
  addScoreAddBank(ctx.treasureRun, treasureId, delta);
  await ctx.playOwnedTreasureScoreDeltaFx?.(treasureId, delta);
}

/**
 * 乘法倍率银行累乘后的动效（× 文案气泡，不含再次乘算）。
 * @param {{ wobbleOwnedTreasureById?: (id: string) => Promise<void>, playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {string} [bubbleText]
 */
export async function playBankMultMulGainFx(ctx, treasureId, bubbleText) {
  await ctx.wobbleOwnedTreasureById?.(treasureId);
  if (bubbleText) await ctx.playOwnedTreasureBubbleFx?.(treasureId, bubbleText, "mult");
}

/**
 * 乘法倍率银行单次累乘 + 动效。
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, wobbleOwnedTreasureById?: (id: string) => Promise<void>, playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} factor
 * @param {string} [bubbleText]
 */
export async function bankMultMulGain(ctx, treasureId, factor, bubbleText) {
  multiplyMultMulBank(ctx.treasureRun, treasureId, factor);
  await playBankMultMulGainFx(ctx, treasureId, bubbleText);
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
      if (band === "multAdd") {
        const v = rs ? Math.round(getMultAddBank(rs, treasureId)) : 0;
        return describe("（当前", mult(v >= 0 ? `+${v}` : String(v)), "）");
      }
      if (band === "scoreAdd") {
        const v = rs ? Math.round(getScoreAddBank(rs, treasureId)) : 0;
        return describe("（当前", score(v >= 0 ? `+${v}` : String(v)), "）");
      }
      if (!rs) {
        return describe("（当前", mult("x1"), "）");
      }
      const v = getMultMulBank(rs, treasureId);
      const shown = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
      return describe("（当前", mult(`x${shown || "1"}`), "）");
    },
  };
}
