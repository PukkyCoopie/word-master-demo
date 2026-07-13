import { resolvePhysicalTreasureSlotIndex, resolvePostLetterAnimSlotIndex, shouldTreasureRunAccumulationMutate } from "../game/treasureBlueprintMirror.js";
import { shouldSkipSettlementTreasureFx } from "../settings/settlementAnimSkip.js";
import { describe, mult, score } from "./treasureDescription.js";
import {
  bumpOwnedSlotBankRevision,
  createDefaultTreasureBank,
  ensureGlobalTreasureBank,
  ensureOwnedSlotBank,
  isGlobalTreasureBank,
} from "./treasureRunState.js";

/**
 * @typedef {Object} TreasureBankAccess
 * @property {number} [slotIndex] 详情/预览用物理槽下标
 * @property {object[]} [ownedTreasureInstances] 与槽位同索引的宝藏实例（含 null 槽）
 * @property {{ ownedSlotTreasureIds?: (string | null | undefined)[], hookSlotIndex?: number, hookSource?: 'self' | 'blueprint', ownedTreasureInstances?: object[], slotIndex?: number }} [hookCtx]
 */

/**
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} access
 * @returns {TreasureBankAccess | undefined}
 */
function normalizeBankAccess(access) {
  if (!access) return undefined;
  if (access.hookCtx && typeof access.hookCtx === "object") {
    return /** @type {TreasureBankAccess} */ (access);
  }
  if (
    typeof access.hookSlotIndex === "number" ||
    typeof access.slotIndex === "number" ||
    Array.isArray(access.ownedTreasureInstances)
  ) {
    return { hookCtx: /** @type {TreasureBankAccess['hookCtx']} */ (access) };
  }
  return /** @type {TreasureBankAccess} */ (access);
}

/**
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} access
 * @param {string} treasureId
 * @returns {number | null}
 */
function resolveOwnedSlotIndexForBank(access, treasureId) {
  const normalized = normalizeBankAccess(access);
  if (!normalized) return null;
  const hookCtx = normalized.hookCtx;
  const instances = normalized.ownedTreasureInstances ?? hookCtx?.ownedTreasureInstances;
  let ix =
    typeof normalized.slotIndex === "number" && Number.isFinite(normalized.slotIndex)
      ? Math.floor(normalized.slotIndex)
      : null;
  if (ix == null && hookCtx && typeof hookCtx.slotIndex === "number") {
    ix = Math.floor(Number(hookCtx.slotIndex));
  }
  if (ix == null && hookCtx && typeof hookCtx.hookSlotIndex === "number") {
    const owned = hookCtx.ownedSlotTreasureIds;
    if (Array.isArray(owned)) {
      ix = resolvePhysicalTreasureSlotIndex(
        owned,
        treasureId,
        hookCtx.hookSlotIndex,
      );
    } else {
      ix = Math.floor(Number(hookCtx.hookSlotIndex));
    }
  }
  if (ix == null || !Number.isFinite(ix) || ix < 0) return null;
  if (Array.isArray(instances)) {
    const slot = instances[ix];
    if (!slot || String(slot.treasureId ?? "") !== String(treasureId)) return null;
  }
  return ix;
}

/**
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} access
 * @param {string} treasureId
 * @returns {Record<string, unknown> | null}
 */
function resolveOwnedSlotForBank(access, treasureId) {
  const normalized = normalizeBankAccess(access);
  const instances = normalized?.ownedTreasureInstances ?? normalized?.hookCtx?.ownedTreasureInstances;
  const ix = resolveOwnedSlotIndexForBank(access, treasureId);
  if (ix == null || !Array.isArray(instances)) return null;
  const slot = instances[ix];
  if (!slot || typeof slot !== "object") return null;
  if (String(slot.treasureId ?? "") !== String(treasureId)) return null;
  return /** @type {Record<string, unknown>} */ (slot);
}

/**
 * 只读银行快照：不创建/规范化槽位 bank（避免详情 computed 等读路径触发 slot 变更）。
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [access]
 * @returns {import('./treasureRunState.js').TreasureIdBank | null}
 */
function readTreasureBank(runState, treasureId, access) {
  const id = String(treasureId ?? "").trim();
  if (!id) return null;
  if (isGlobalTreasureBank(id)) {
    const bank = runState?.banks?.[id];
    return bank && typeof bank === "object"
      ? /** @type {import('./treasureRunState.js').TreasureIdBank} */ (bank)
      : null;
  }
  const slot = resolveOwnedSlotForBank(access, id);
  if (!slot?.bank || typeof slot.bank !== "object") return null;
  return /** @type {import('./treasureRunState.js').TreasureIdBank} */ (slot.bank);
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [access]
 * @returns {import('./treasureRunState.js').TreasureIdBank | null}
 */
function resolveTreasureBankMutable(runState, treasureId, access) {
  const id = String(treasureId ?? "").trim();
  if (!id) return null;
  if (isGlobalTreasureBank(id)) {
    if (!runState) return null;
    return ensureGlobalTreasureBank(runState, id);
  }
  const slot = resolveOwnedSlotForBank(access, id);
  if (!slot) return null;
  return ensureOwnedSlotBank(slot);
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [access]
 * @returns {import('./treasureRunState.js').TreasureIdBank | null}
 */
export function readTreasureBankSnapshot(runState, treasureId, access) {
  const id = String(treasureId ?? "").trim();
  if (!id) return null;
  if (isGlobalTreasureBank(id)) {
    const bank = runState?.banks?.[id];
    return bank ? { ...bank } : null;
  }
  const slot = resolveOwnedSlotForBank(access, id);
  if (!slot?.bank || typeof slot.bank !== "object") return null;
  return { .../** @type {import('./treasureRunState.js').TreasureIdBank} */ (slot.bank) };
}

/**
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} access
 * @param {string} treasureId
 * @param {Partial<import('./treasureRunState.js').TreasureIdBank>} fields
 */
export function assignOwnedSlotTreasureBank(access, treasureId, fields) {
  const slot = resolveOwnedSlotForBank(access, treasureId);
  if (!slot) return;
  const bank = ensureOwnedSlotBank(slot);
  if (fields.multAdd != null) bank.multAdd = Number(fields.multAdd) || 0;
  if (fields.multMul != null) {
    const m = Number(fields.multMul);
    bank.multMul = m > 0 ? m : 1;
  }
  if (fields.scoreAdd != null) bank.scoreAdd = Number(fields.scoreAdd) || 0;
  if (fields.posPackProgress != null) {
    bank.posPackProgress = Math.max(0, Math.floor(Number(fields.posPackProgress) || 0));
  }
  bumpOwnedSlotBankRevision(resolveTreasureRunFromBankAccess(access));
}

/**
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} access
 * @returns {import('./treasureRunState.js').TreasureRunState | null | undefined}
 */
function resolveTreasureRunFromBankAccess(access) {
  if (!access || typeof access !== "object") return null;
  if ("treasureRun" in access && access.treasureRun) {
    return /** @type {import('./treasureRunState.js').TreasureRunState} */ (access.treasureRun);
  }
  const hookCtx = normalizeBankAccess(access)?.hookCtx;
  if (hookCtx && typeof hookCtx === "object" && "treasureRun" in hookCtx && hookCtx.treasureRun) {
    return /** @type {import('./treasureRunState.js').TreasureRunState} */ (hookCtx.treasureRun);
  }
  return null;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 */
function notifyOwnedSlotBankMutated(runState, treasureId) {
  if (!isGlobalTreasureBank(treasureId)) {
    bumpOwnedSlotBankRevision(runState);
  }
}

/**
 * @param {object[]} ownedTreasures
 * @param {(string | null | undefined)[]} ownedSlotIds
 * @param {number} slotIndex
 * @param {'self' | 'blueprint'} [hookSource]
 */
export function treasureBankHookCtxFromSubmitSlot(
  ownedTreasures,
  ownedSlotIds,
  slotIndex,
  hookSource = "self",
) {
  return {
    hookSlotIndex: slotIndex,
    hookSource,
    ownedSlotTreasureIds: ownedSlotIds,
    ownedTreasureInstances: ownedTreasures,
  };
}

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
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [access]
 */
export function getMultAddBank(runState, treasureId, access) {
  const bank = readTreasureBank(runState, treasureId, access);
  if (bank) return bank.multAdd;
  return 0;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [access]
 */
export function getMultMulBank(runState, treasureId, access) {
  const bank = readTreasureBank(runState, treasureId, access);
  if (bank) {
    const m = Number(bank.multMul);
    return m > 0 ? m : 1;
  }
  return 1;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [access]
 */
export function getScoreAddBank(runState, treasureId, access) {
  const bank = readTreasureBank(runState, treasureId, access);
  if (bank) return bank.scoreAdd;
  return 0;
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} delta
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [hookCtx]
 */
export function addMultAddBank(runState, treasureId, delta, hookCtx) {
  if (hookCtx && !canMutateTreasureBankFromCtx(/** @type {object} */ (hookCtx), treasureId)) return;
  const bank = resolveTreasureBankMutable(runState, treasureId, hookCtx);
  if (!bank) return;
  bank.multAdd += Number(delta) || 0;
  notifyOwnedSlotBankMutated(runState, treasureId);
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
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} increment
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [hookCtx]
 */
export function addMultMulBank(runState, treasureId, increment, hookCtx) {
  if (hookCtx && !canMutateTreasureBankFromCtx(/** @type {object} */ (hookCtx), treasureId)) return;
  const d = Number(increment);
  if (!Number.isFinite(d) || d === 0) return;
  const bank = resolveTreasureBankMutable(runState, treasureId, hookCtx);
  if (!bank) return;
  bank.multMul += d;
  notifyOwnedSlotBankMutated(runState, treasureId);
}

/**
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} runState
 * @param {string} treasureId
 * @param {number} delta
 * @param {TreasureBankAccess | Record<string, unknown> | null | undefined} [hookCtx]
 */
export function addScoreAddBank(runState, treasureId, delta, hookCtx) {
  if (hookCtx && !canMutateTreasureBankFromCtx(/** @type {object} */ (hookCtx), treasureId)) return;
  const bank = resolveTreasureBankMutable(runState, treasureId, hookCtx);
  if (!bank) return;
  bank.scoreAdd += Number(delta) || 0;
  notifyOwnedSlotBankMutated(runState, treasureId);
}

/**
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, playOwnedTreasureMultDeltaFx?: (id: string, delta: number) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} delta
 */
export async function bankMultAddGain(ctx, treasureId, delta) {
  if (canMutateTreasureBankFromCtx(ctx, treasureId)) {
    addMultAddBank(ctx.treasureRun, treasureId, delta, ctx);
  }
  if (ctx?.skipSettlementFx === true || shouldSkipSettlementTreasureFx()) return;
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (slotIx != null && ctx.playTreasureMultDeltaFxAtSlot) {
    await ctx.playTreasureMultDeltaFxAtSlot(slotIx, delta);
    return;
  }
  await ctx.playOwnedTreasureMultDeltaFx?.(treasureId, delta);
}

/**
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, playOwnedTreasureScoreDeltaFx?: (id: string, delta: number) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} delta
 */
export async function bankScoreAddGain(ctx, treasureId, delta) {
  if (canMutateTreasureBankFromCtx(ctx, treasureId)) {
    addScoreAddBank(ctx.treasureRun, treasureId, delta, ctx);
  }
  if (ctx?.skipSettlementFx === true || shouldSkipSettlementTreasureFx()) return;
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (slotIx != null && ctx.playTreasureScoreDeltaFxAtSlot) {
    await ctx.playTreasureScoreDeltaFxAtSlot(slotIx, delta);
    return;
  }
  await ctx.playOwnedTreasureScoreDeltaFx?.(treasureId, delta);
}

/**
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
  if (ctx?.skipSettlementFx === true || shouldSkipSettlementTreasureFx()) return;
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
 * @param {{ ownedSlotTreasureIds?: (string | null | undefined)[], hookSlotIndex?: number, hookSource?: 'self' | 'blueprint', playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void>, playOwnedTreasureBubbleFxAtSlot?: (slotIndex: number, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {string} text
 * @param {string} [kind]
 */
export async function playTreasureHookBubbleFx(ctx, treasureId, text, kind = "score") {
  if (ctx?.skipSettlementFx === true || shouldSkipSettlementTreasureFx()) return;
  const slotIx = resolveTreasureHookFxSlotIndex(ctx, treasureId);
  if (slotIx != null && ctx.playOwnedTreasureBubbleFxAtSlot) {
    await ctx.playOwnedTreasureBubbleFxAtSlot(slotIx, text, kind);
    return;
  }
  await ctx.playOwnedTreasureBubbleFx?.(treasureId, text, kind);
}

/**
 * @param {Parameters<typeof playTreasureHookBubbleFx>[0]} ctx
 * @param {string} treasureId
 * @param {string} text
 * @param {string} [kind]
 */
export async function playTreasureHookBubbleOnlyFx(ctx, treasureId, text, kind = "score") {
  if (ctx?.skipSettlementFx === true || shouldSkipSettlementTreasureFx()) return;
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
 * @param {{ wobbleOwnedTreasureById?: (id: string) => Promise<void>, playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {string} [bubbleText]
 */
export async function playBankMultMulGainFx(ctx, treasureId, bubbleText) {
  if (ctx?.skipSettlementFx === true || shouldSkipSettlementTreasureFx()) return;
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
 * @param {{ treasureRun?: import('./treasureRunState.js').TreasureRunState, wobbleOwnedTreasureById?: (id: string) => Promise<void>, playOwnedTreasureBubbleFx?: (id: string, text: string, kind?: string) => Promise<void> }} ctx
 * @param {string} treasureId
 * @param {number} increment
 * @param {string} [bubbleText]
 */
export async function bankMultMulGain(ctx, treasureId, increment, bubbleText) {
  if (canMutateTreasureBankFromCtx(ctx, treasureId)) {
    addMultMulBank(ctx.treasureRun, treasureId, increment, ctx);
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
 * @param {{ multAdd?: number, multMul?: number, scoreAdd?: number } | null | undefined} [previewInitialWhenUnowned]
 */
export function patchCurrentBankDescription(treasureId, band, _zeroLabel = "+0", previewInitialWhenUnowned = null) {
  return {
    patchDescription(ctx) {
      const bank = isGlobalTreasureBank(treasureId)
        ? ctx.treasureRun?.banks?.[treasureId] ?? null
        : readTreasureBankSnapshot(ctx.treasureRun, treasureId, ctx);
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

export { createDefaultTreasureBank };
