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
 * 「获得 xN 倍率」类宝藏：在 1 的基础上累加增量（如 x0.25 → +0.25，银行 1→1.25→1.5）。
 * 计分时再将银行值作为 {@link buildPostLetterStep} 的 `multMul` 乘入总倍率。
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} increment 加法增量（可为负，如磁铁每弃字 -0.01）
 */
export function addMultMulBank(runState, treasureId, increment) {
  if (!runState) return;
  const d = Number(increment);
  if (!Number.isFinite(d) || d === 0) return;
  ensureTreasureBank(runState, treasureId).multMul += d;
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
  if (bubbleText) {
    await ctx.playOwnedTreasureBubbleFx?.(treasureId, bubbleText, "mult");
    return;
  }
  await ctx.wobbleOwnedTreasureById?.(treasureId);
}

/**
 * 倍率银行单次累加 + 动效。
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, wobbleOwnedTreasureById?: (id: string) => Promise<void>, playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} increment 与 `addMultMulBank` 相同（x0.25 → 0.25）
 * @param {string} [bubbleText]
 */
export async function bankMultMulGain(ctx, treasureId, increment, bubbleText) {
  addMultMulBank(ctx.treasureRun, treasureId, increment);
  await playBankMultMulGainFx(ctx, treasureId, bubbleText);
}

/**
 * @param {string} treasureId
 * @param {'multAdd' | 'multMul' | 'scoreAdd'} band
 * @param {string} [_zeroLabel]
 * @param {{ multAdd?: number, multMul?: number, scoreAdd?: number } | null | undefined} [previewInitialWhenUnowned] 未购入/银行未初始化时商店预览用的起始值（如火车 +30、磁铁 x2）
 */
export function patchCurrentBankDescription(treasureId, band, _zeroLabel = "+0", previewInitialWhenUnowned = null) {
  return {
    patchDescription(ctx) {
      const bank = ctx.treasureRun?.banks?.[treasureId] ?? null;
      if (band === "multAdd") {
        let v = 0;
        if (bank) {
          v = Math.round(Number(bank.multAdd) || 0);
        } else if (previewInitialWhenUnowned?.multAdd != null) {
          v = Math.round(Number(previewInitialWhenUnowned.multAdd) || 0);
        }
        return describe("（当前", mult(v >= 0 ? `+${v}` : String(v)), "）");
      }
      if (band === "scoreAdd") {
        let v = 0;
        if (bank) {
          v = Math.round(Number(bank.scoreAdd) || 0);
        } else if (previewInitialWhenUnowned?.scoreAdd != null) {
          v = Math.round(Number(previewInitialWhenUnowned.scoreAdd) || 0);
        }
        return describe("（当前", score(v >= 0 ? `+${v}` : String(v)), "）");
      }
      let v = 1;
      if (bank) {
        const m = Number(bank.multMul);
        v = m > 0 ? m : 1;
      } else if (previewInitialWhenUnowned?.multMul != null) {
        const m = Number(previewInitialWhenUnowned.multMul);
        v = m > 0 ? m : 1;
      }
      const shown = Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/\.?0+$/, "");
      return describe("（当前", mult(`x${shown || "1"}`), "）");
    },
  };
}
