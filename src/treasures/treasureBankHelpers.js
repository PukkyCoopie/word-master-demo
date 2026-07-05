import { resolvePostLetterAnimSlotIndex, shouldTreasureRunAccumulationMutate } from "../game/treasureBlueprintMirror.js";
import { describe, mult, score } from "./treasureDescription.js";
import { ensureTreasureBank } from "./treasureRunState.js";

/**
 * @param {{ ownedSlotTreasureIds?: (string | null | undefined)[], hookSlotIndex?: number, hookSource?: 'self' | 'blueprint' }} ctx
 * @param {string} treasureId
 * @returns {number | undefined}
 */
function resolveTreasureHookFxSlotIndex(ctx, treasureId) {
  const owned = ctx.ownedSlotTreasureIds;
  const hookSlotIndex = ctx.hookSlotIndex;
  if (!owned?.length || typeof hookSlotIndex !== "number" || !Number.isFinite(hookSlotIndex)) {
    return undefined;
  }
  return resolvePostLetterAnimSlotIndex(
    owned,
    treasureId,
    hookSlotIndex,
    ctx.hookSource === "blueprint" ? "blueprint" : "self",
  );
}

/**
 * 面具/绵羊 blueprint 镜像只复现计分结果，不写被复制宝藏的 run 银行。
 * @param {{ ownedSlotTreasureIds?: (string | null | undefined)[], hookSlotIndex?: number, hookSource?: 'self' | 'blueprint' } | null | undefined} ctx
 * @param {string} treasureId
 */
export function canMutateTreasureBankFromCtx(ctx, treasureId) {
  if (!ctx) return true;
  const owned = ctx.ownedSlotTreasureIds;
  const slotIx = ctx.hookSlotIndex;
  if (!Array.isArray(owned) || slotIx == null || Number.isNaN(Number(slotIx))) return true;
  const source = ctx.hookSource === "blueprint" ? "blueprint" : "self";
  return shouldTreasureRunAccumulationMutate(
    owned,
    Math.max(0, Math.floor(Number(slotIx))),
    treasureId,
    source,
  );
}

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
export function addMultAddBank(runState, treasureId, delta, hookCtx) {
  if (hookCtx && !canMutateTreasureBankFromCtx(hookCtx, treasureId)) return;
  if (!runState) return;
  ensureTreasureBank(runState, treasureId).multAdd += Number(delta) || 0;
}

/**
 * 倍率银行单次 increment 的获得动效文案（+0.25、-0.01）；计分时乘入总倍率仍用 × 气泡。
 * @param {number} increment 与 `addMultMulBank` 相同（x0.25 → 0.25）
 */
export function formatMultMulBankGainLabel(increment) {
  const d = Number(increment);
  if (!Number.isFinite(d) || d === 0) return "+0";
  const abs = Math.abs(d);
  const shown = Number.isInteger(abs) ? String(abs) : abs.toFixed(2).replace(/\.?0+$/, "");
  return d > 0 ? `+${shown}` : `-${shown}`;
}

/**
 * 「获得 xN 倍率」类宝藏：在 1 的基础上累加增量（如 x0.25 → +0.25，银行 1→1.25→1.5）。
 * 计分时再将银行值作为 {@link buildPostLetterStep} 的 `multMul` 乘入总倍率。
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} increment 加法增量（可为负，如磁铁每弃字 -0.01）
 */
export function addMultMulBank(runState, treasureId, increment, hookCtx) {
  if (hookCtx && !canMutateTreasureBankFromCtx(hookCtx, treasureId)) return;
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
export function addScoreAddBank(runState, treasureId, delta, hookCtx) {
  if (hookCtx && !canMutateTreasureBankFromCtx(hookCtx, treasureId)) return;
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
  if (canMutateTreasureBankFromCtx(ctx, treasureId)) {
    addMultAddBank(ctx.treasureRun, treasureId, delta);
  }
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (slotIx != null && ctx.playTreasureMultDeltaFxAtSlot) {
    await ctx.playTreasureMultDeltaFxAtSlot(slotIx, delta);
    return;
  }
  await ctx.playOwnedTreasureMultDeltaFx?.(treasureId, delta);
}

/**
 * 累加分数银行 + 宝藏槽 wobble / +n 分气泡。
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, playOwnedTreasureScoreDeltaFx?: (id: string, delta: number) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} delta
 */
export async function bankScoreAddGain(ctx, treasureId, delta) {
  if (canMutateTreasureBankFromCtx(ctx, treasureId)) {
    addScoreAddBank(ctx.treasureRun, treasureId, delta);
  }
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (slotIx != null && ctx.playTreasureScoreDeltaFxAtSlot) {
    await ctx.playTreasureScoreDeltaFxAtSlot(slotIx, delta);
    return;
  }
  await ctx.playOwnedTreasureScoreDeltaFx?.(treasureId, delta);
}

/**
 * 按 hook 贡献槽 wobble：实体宝藏 wobble 真实槽；面具/绵羊 blueprint 镜像 wobble 面具/绵羊槽。
 * @param {{
 *   ownedSlotTreasureIds?: (string | null | undefined)[],
 *   hookSlotIndex?: number,
 *   hookSource?: 'self' | 'blueprint',
 *   wobbleOwnedTreasureAtSlot?: (slotIndex: number) => Promise<void>,
 *   playOwnedTreasureWobbleOnlyFx?: (treasureId: string) => Promise<void>,
 *   wobbleOwnedTreasureById?: (treasureId: string) => Promise<void>,
 * }} ctx
 * @param {string} treasureId
 */
export async function wobbleTreasureHookContributor(ctx, treasureId) {
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (slotIx != null && ctx.wobbleOwnedTreasureAtSlot) {
    await ctx.wobbleOwnedTreasureAtSlot(slotIx);
    return;
  }
  if (typeof ctx.playOwnedTreasureWobbleOnlyFx === "function") {
    await ctx.playOwnedTreasureWobbleOnlyFx(treasureId);
    return;
  }
  await ctx.wobbleOwnedTreasureById?.(treasureId);
}

/**
 * 宝藏槽 wobble + 气泡（按 hook 贡献槽；无槽信息时回退按 id 全槽）。
 * @param {{ ownedSlotTreasureIds?: (string | null | undefined)[], hookSlotIndex?: number, hookSource?: 'self' | 'blueprint', playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void>, playOwnedTreasureBubbleFxAtSlot?: (slotIndex: number, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {string} text
 * @param {string} [kind]
 */
export async function playTreasureHookBubbleFx(ctx, treasureId, text, kind = "score") {
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (slotIx != null && ctx.playOwnedTreasureBubbleFxAtSlot) {
    await ctx.playOwnedTreasureBubbleFxAtSlot(slotIx, text, kind);
    return;
  }
  await ctx.playOwnedTreasureBubbleFx?.(treasureId, text, kind);
}

/**
 * 仅气泡（按 hook 贡献槽；无 AtSlot 时回退 BubbleOnlyFx 或完整 BubbleFx）。
 * @param {Parameters<typeof playTreasureHookBubbleFx>[0]} ctx
 * @param {string} treasureId
 * @param {string} text
 * @param {string} [kind]
 */
export async function playTreasureHookBubbleOnlyFx(ctx, treasureId, text, kind = "score") {
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (slotIx != null && ctx.playOwnedTreasureBubbleOnlyFxAtSlot) {
    await ctx.playOwnedTreasureBubbleOnlyFxAtSlot(slotIx, text, kind);
    return;
  }
  if (typeof ctx.playOwnedTreasureBubbleOnlyFx === "function") {
    await ctx.playOwnedTreasureBubbleOnlyFx(treasureId, text, kind);
    return;
  }
  await playTreasureHookBubbleFx(ctx, treasureId, text, kind);
}

/**
 * 倍率银行累加后的获得动效（+n 文案气泡，不含再次乘算）。
 * @param {{ wobbleOwnedTreasureById?: (id: string) => Promise<void>, playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {string} [bubbleText] 默认由 {@link formatMultMulBankGainLabel} 从 increment 生成
 */
export async function playBankMultMulGainFx(ctx, treasureId, bubbleText) {
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (bubbleText) {
    if (slotIx != null && ctx.playOwnedTreasureBubbleFxAtSlot) {
      await ctx.playOwnedTreasureBubbleFxAtSlot(slotIx, bubbleText, "mult");
      return;
    }
    await ctx.playOwnedTreasureBubbleFx?.(treasureId, bubbleText, "mult");
    return;
  }
  if (slotIx != null && ctx.wobbleOwnedTreasureAtSlot) {
    await ctx.wobbleOwnedTreasureAtSlot(slotIx);
    return;
  }
  await ctx.wobbleOwnedTreasureById?.(treasureId);
}

/**
 * 倍率银行单次累加 + 动效。
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, wobbleOwnedTreasureById?: (id: string) => Promise<void>, playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} increment 与 `addMultMulBank` 相同（x0.25 → 0.25）
 * @param {string} [bubbleText] 省略时用 {@link formatMultMulBankGainLabel}(increment)
 */
export async function bankMultMulGain(ctx, treasureId, increment, bubbleText) {
  if (canMutateTreasureBankFromCtx(ctx, treasureId)) {
    addMultMulBank(ctx.treasureRun, treasureId, increment);
  }
  await playBankMultMulGainFx(
    ctx,
    treasureId,
    bubbleText ?? formatMultMulBankGainLabel(increment),
  );
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
