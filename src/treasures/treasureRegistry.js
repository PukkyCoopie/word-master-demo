/** 全量宝藏定义（效果逻辑由各宝藏 js 预留，尚未接入游戏） */
import {
  forEachTreasureHookContribution,
  iterTreasureHookContributions,
} from "../game/treasureBlueprintMirror.js";
import { TREASURE_CATALOG_BY_ID } from "./treasureCatalog.js";

const modules = import.meta.glob("./items/*.js", { eager: true });

const moduleEntries = Object.entries(modules)
  .map(([path, m]) => {
    const def = "default" in m ? m.default : null;
    if (!def) return null;
    const match = path.match(/treasure_(\d+)\.js$/);
    if (!match) return null;
    const treasureId = String(Number(match[1]));
    return { treasureId, modulePath: path, def, hooks: m.treasureHooks ?? null };
  })
  .filter(Boolean);

/** @type {import('./treasureTypes.js').TreasureDef[]} */
export const TREASURE_DEFINITIONS = moduleEntries
  .map(({ treasureId, modulePath, def }) => {
    const catalog = TREASURE_CATALOG_BY_ID.get(treasureId);
    if (import.meta.env.DEV && (!catalog || !catalog.name || !catalog.emoji)) {
      console.warn(
        `[treasureRegistry] Missing catalog data for treasureId=${treasureId}${modulePath ? ` path=${modulePath}` : ""}`,
      );
    }
    return {
      ...def,
      treasureId,
      name: catalog?.name ?? def.name,
      emoji: catalog?.emoji ?? def.emoji,
    };
  })
  .filter(Boolean)
  .sort((a, b) => Number(a.treasureId) - Number(b.treasureId));

/** @type {ReadonlyMap<string, import('./treasureTypes.js').TreasureHooks>} */
export const TREASURE_HOOKS_BY_ID = new Map(
  moduleEntries
    .filter((e) => e.hooks)
    .map((e) => [e.treasureId, e.hooks]),
);

/** @param {string} treasureId */
export function getTreasureDef(treasureId) {
  return TREASURE_DEFINITIONS.find((t) => t.treasureId === treasureId) ?? null;
}

/**
 * @param {string | null | undefined} treasureId
 * @param {number} chargeWordsSubmitted
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} [treasureRun]
 * @returns {'inactive' | 'active' | null}
 */
export function resolveTreasureChargeVisualState(treasureId, chargeWordsSubmitted, treasureRun) {
  if (!treasureId) return null;
  const hooks = TREASURE_HOOKS_BY_ID.get(treasureId);
  if (!hooks?.getChargeVisualState) return null;
  return hooks.getChargeVisualState({ chargeWordsSubmitted, treasureRun: treasureRun ?? undefined });
}

/**
 * @param {string | null | undefined} treasureId
 * @param {number} chargeWordsSubmitted
 * @param {import('./treasureRunState.js').TreasureRunState | null | undefined} [treasureRun]
 * @returns {number}
 */
export function resolveTreasureChargeProgress(treasureId, chargeWordsSubmitted, treasureRun) {
  if (!treasureId) return 0;
  const hooks = TREASURE_HOOKS_BY_ID.get(treasureId);
  if (!hooks?.getChargeProgress) return 0;
  return hooks.getChargeProgress({ chargeWordsSubmitted, treasureRun: treasureRun ?? undefined });
}

/** @param {object} ctx @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {{ slotIndex: number, source: 'self' | 'blueprint' }} entry */
function withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source }) {
  return {
    ...ctx,
    ownedSlotTreasureIds: ownedSlotTreasureIds ?? ctx.ownedSlotTreasureIds,
    hookSlotIndex: slotIndex,
    hookSource: source,
  };
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('./treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @returns {Promise<void>}
 */
export async function notifyOwnedTreasuresSuccessfulWordSubmit(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onSuccessfulWordSubmit;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('./treasureTypes.js').TreasureWordDefinitionOpenContext} ctx
 * @returns {Promise<boolean>} 是否被某宝藏拦截（不打开释义弹窗）
 */
export async function notifyOwnedTreasuresOnWordDefinitionOpenAttempt(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const raw of ownedSlotTreasureIds ?? []) {
    const tid = String(raw ?? "").trim();
    if (!tid || seen.has(tid)) continue;
    seen.add(tid);
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onWordDefinitionOpenAttempt;
    if (!fn) continue;
    const result = await fn({ ...ctx, ownedSlotTreasureIds: ownedSlotTreasureIds ?? [] });
    if (result?.blocked) return true;
  }
  return false;
}

/**
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('./treasureTypes.js').TreasureWordDefinitionPresentationContext} ctx
 * @returns {'button' | 'definition'}
 */
export function resolveWordDefinitionTriggerMode(ownedSlotTreasureIds, ctx) {
  if (ctx.displayMode !== "definition") return "button";
  const seen = new Set();
  for (const raw of ownedSlotTreasureIds ?? []) {
    const tid = String(raw ?? "").trim();
    if (!tid || seen.has(tid)) continue;
    seen.add(tid);
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.resolveWordDefinitionTriggerMode;
    if (!fn) continue;
    const result = fn({ ...ctx, ownedSlotTreasureIds: ownedSlotTreasureIds ?? [] });
    if (result?.triggerMode === "button") return "button";
  }
  return "definition";
}

/**
 * 逐字母计分动画结束后、字后宝藏步开始前（同 id 多槽不重复）
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('./treasureTypes.js').TreasureSubmitAfterLettersContext} ctx
 */
export async function notifySubmitAfterLettersBeforePostSteps(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.runAfterLettersBeforePostSteps;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureDiscardContext} ctx */
export async function notifyOwnedTreasuresOnDiscardBatch(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onDiscardBatch;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureLevelEnterContext} ctx */
export async function notifyOwnedTreasuresPrepareLevelEnter(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.prepareLevelEnter;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureLevelEnterContext} ctx */
export async function notifyOwnedTreasuresOnLevelEnter(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onLevelEnter;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureLevelCompleteContext} ctx */
export async function notifyOwnedTreasuresOnLevelComplete(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onLevelComplete;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureChapterEnterContext} ctx */
export function notifyOwnedTreasuresOnChapterEnter(ownedSlotTreasureIds, ctx) {
  for (const { treasureId: tid } of iterTreasureHookContributions(ownedSlotTreasureIds ?? [])) {
    TREASURE_HOOKS_BY_ID.get(tid)?.onChapterEnter?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureShopEnterContext} ctx */
export async function notifyOwnedTreasuresOnShopEnter(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onShopEnter;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureShopRerollContext} ctx */
export async function notifyOwnedTreasuresOnShopReroll(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onShopReroll;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasurePackSkippedContext} ctx */
export async function notifyOwnedTreasuresOnPackSkipped(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onPackSkipped;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureSoldContext} ctx */
export async function notifyOwnedTreasuresOnTreasureSold(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onTreasureSold;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureShopLeaveContext} ctx */
export async function notifyOwnedTreasuresOnShopLeave(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onShopLeave;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureDeckCardsRemovedContext} ctx */
export async function notifyOwnedTreasuresOnDeckCardsRemoved(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onDeckCardsRemoved;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureIceBreakContext} ctx */
export async function notifyOwnedTreasuresOnIceBreak(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onIceMaterialBreak;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureBossRestrictionContext} ctx */
export async function notifyOwnedTreasuresOnBossRestrictionTriggered(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onBossRestrictionTriggered;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureDeckCardsAddedContext} ctx */
export async function notifyOwnedTreasuresOnDeckCardsAdded(ownedSlotTreasureIds, ctx) {
  await forEachTreasureHookContribution(ownedSlotTreasureIds, ({ treasureId: tid, slotIndex, source }) => {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.onDeckCardsAdded;
    return fn
      ? Promise.resolve(fn(withTreasureHookContributionCtx(ctx, ownedSlotTreasureIds, { slotIndex, source })))
      : undefined;
  });
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function sumTreasureSubmitLengthBonus(ownedSlotTreasureIds) {
  const slots = ownedSlotTreasureIds ?? [];
  let sum = 0;
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.getSubmitLengthBonus;
    if (!fn) continue;
    sum += Math.max(0, Math.floor(Number(fn({ ownedSlotTreasureIds: slots })) || 0));
  }
  return sum;
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function sumTreasureHandsPerLevelDelta(ownedSlotTreasureIds) {
  const slots = ownedSlotTreasureIds ?? [];
  let sum = 0;
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.getHandsPerLevelDelta;
    if (!fn) continue;
    sum += Math.floor(Number(fn({ ownedSlotTreasureIds: slots })) || 0);
  }
  return sum;
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function sumTreasureRemovalsPerLevelDelta(ownedSlotTreasureIds) {
  const slots = ownedSlotTreasureIds ?? [];
  let sum = 0;
  for (const { treasureId: tid } of iterTreasureHookContributions(slots)) {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.getRemovalsPerLevelDelta;
    if (!fn) continue;
    sum += Math.floor(Number(fn({ ownedSlotTreasureIds: slots })) || 0);
  }
  return sum;
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function resolveTreasureWalletFloor(ownedSlotTreasureIds) {
  let floor = 0;
  for (const { treasureId: tid } of iterTreasureHookContributions(ownedSlotTreasureIds ?? [])) {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.getWalletFloor;
    if (!fn) continue;
    const v = Math.floor(Number(fn()) || 0);
    if (v < floor) floor = v;
  }
  return floor;
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function sumTreasureLengthJudgmentPenalty(ownedSlotTreasureIds) {
  let sum = 0;
  for (const { treasureId: tid } of iterTreasureHookContributions(ownedSlotTreasureIds ?? [])) {
    const fn = TREASURE_HOOKS_BY_ID.get(tid)?.getLengthJudgmentPenalty;
    if (!fn) continue;
    sum += Math.max(0, Math.floor(Number(fn()) || 0));
  }
  return sum;
}

/**
 * @param {string | null | undefined} treasureId
 * @param {import('./treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
export function resolveTreasureDescriptionPatches(treasureId, ctx) {
  const id = String(treasureId ?? "").trim();
  if (!id) return null;
  const fn = TREASURE_HOOKS_BY_ID.get(id)?.patchDescription;
  if (!fn) return null;
  try {
    const out = fn(ctx);
    return out?.length ? out : null;
  } catch {
    return null;
  }
}

/** @param {string | null | undefined} treasureId */
export function treasureDescriptionPatchReplacesBase(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return false;
  return TREASURE_HOOKS_BY_ID.get(id)?.replaceDescriptionWithPatch === true;
}

/**
 * 宝藏详情层：主简介下方的**材质/配饰类**补充说明（由各 `treasureHooks.getDetailGainPanel` 提供；项目中仅彩虹等少数与牌张材质相关的宝藏应实现）。
 * @param {string | null | undefined} treasureId
 * @returns {{ title: string, description: string | import('./treasureDescription.js').TreasureDescSegment[] } | null}
 */
export function resolveTreasureDetailGainPanel(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return null;
  const fn = TREASURE_HOOKS_BY_ID.get(id)?.getDetailGainPanel;
  if (typeof fn !== "function") return null;
  let out;
  try {
    out = fn();
  } catch {
    return null;
  }
  if (!out || typeof out.title !== "string" || !String(out.title).trim()) return null;
  const desc = out.description;
  if (desc == null) return null;
  if (typeof desc === "string" && !String(desc).trim()) return null;
  if (Array.isArray(desc) && desc.length === 0) return null;
  return { title: String(out.title).trim(), description: desc };
}

/**
 * 自毁宝藏：禁售配饰仅阻止卖出，不阻止自身机制触发的摧毁。
 * @param {string | null | undefined} treasureId
 * @returns {boolean}
 */
export function treasureBypassesNoSellForSelfDestruct(treasureId) {
  const id = String(treasureId ?? "").trim();
  if (!id) return false;
  return TREASURE_HOOKS_BY_ID.get(id)?.bypassNoSellForSelfDestruct === true;
}
