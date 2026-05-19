/** 全量宝藏定义（效果逻辑由各宝藏 js 预留，尚未接入游戏） */
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
 * @returns {'inactive' | 'active' | null}
 */
export function resolveTreasureChargeVisualState(treasureId, chargeWordsSubmitted) {
  if (!treasureId) return null;
  const hooks = TREASURE_HOOKS_BY_ID.get(treasureId);
  if (!hooks?.getChargeVisualState) return null;
  return hooks.getChargeVisualState({ chargeWordsSubmitted });
}

/**
 * @param {string | null | undefined} treasureId
 * @param {number} chargeWordsSubmitted
 * @returns {number}
 */
export function resolveTreasureChargeProgress(treasureId, chargeWordsSubmitted) {
  if (!treasureId) return 0;
  const hooks = TREASURE_HOOKS_BY_ID.get(treasureId);
  if (!hooks?.getChargeProgress) return 0;
  return hooks.getChargeProgress({ chargeWordsSubmitted });
}

/**
 * 本词结算成功后：对每个**已出现的** treasureId 调用一次 `onSuccessfulWordSubmit`（同 id 多槽不重复）
 * @param {(string | null | undefined)[]} ownedSlotTreasureIds
 * @param {import('./treasureTypes.js').TreasureSubmitSuccessContext} ctx
 * @returns {Promise<void>}
 */
export async function notifyOwnedTreasuresSuccessfulWordSubmit(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    const fn = TREASURE_HOOKS_BY_ID.get(id)?.onSuccessfulWordSubmit;
    if (fn) await Promise.resolve(fn(ctx));
  }
  const slots = ownedSlotTreasureIds ?? [];
  for (let si = 0; si < slots.length; si++) {
    if (slots[si] !== "98") continue;
    const right = slots[si + 1];
    if (!right || right === "98") continue;
    const fn = TREASURE_HOOKS_BY_ID.get(right)?.onSuccessfulWordSubmit;
    if (fn) await Promise.resolve(fn(ctx));
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureDiscardContext} ctx */
export async function notifyOwnedTreasuresOnDiscardBatch(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    const fn = TREASURE_HOOKS_BY_ID.get(id)?.onDiscardBatch;
    if (fn) await Promise.resolve(fn(ctx));
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureLevelEnterContext} ctx */
export async function notifyOwnedTreasuresPrepareLevelEnter(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    const fn = TREASURE_HOOKS_BY_ID.get(id)?.prepareLevelEnter;
    if (fn) await Promise.resolve(fn(ctx));
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureLevelEnterContext} ctx */
export async function notifyOwnedTreasuresOnLevelEnter(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    const fn = TREASURE_HOOKS_BY_ID.get(id)?.onLevelEnter;
    if (fn) await Promise.resolve(fn(ctx));
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureLevelCompleteContext} ctx */
export async function notifyOwnedTreasuresOnLevelComplete(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    const fn = TREASURE_HOOKS_BY_ID.get(id)?.onLevelComplete;
    if (fn) await Promise.resolve(fn(ctx));
  }
  const slots = ownedSlotTreasureIds ?? [];
  for (let si = 0; si < slots.length; si++) {
    if (slots[si] !== "98") continue;
    const right = slots[si + 1];
    if (!right || right === "98") continue;
    const fn = TREASURE_HOOKS_BY_ID.get(right)?.onLevelComplete;
    if (fn) await Promise.resolve(fn(ctx));
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureChapterEnterContext} ctx */
export function notifyOwnedTreasuresOnChapterEnter(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    TREASURE_HOOKS_BY_ID.get(id)?.onChapterEnter?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureShopEnterContext} ctx */
export function notifyOwnedTreasuresOnShopEnter(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    TREASURE_HOOKS_BY_ID.get(id)?.onShopEnter?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureShopRerollContext} ctx */
export function notifyOwnedTreasuresOnShopReroll(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    TREASURE_HOOKS_BY_ID.get(id)?.onShopReroll?.(ctx);
  }
  const slots = ownedSlotTreasureIds ?? [];
  for (let si = 0; si < slots.length; si++) {
    if (slots[si] !== "98") continue;
    const right = slots[si + 1];
    if (!right || right === "98") continue;
    TREASURE_HOOKS_BY_ID.get(right)?.onShopReroll?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasurePackSkippedContext} ctx */
export function notifyOwnedTreasuresOnPackSkipped(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    TREASURE_HOOKS_BY_ID.get(id)?.onPackSkipped?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureSoldContext} ctx */
export function notifyOwnedTreasuresOnTreasureSold(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    TREASURE_HOOKS_BY_ID.get(id)?.onTreasureSold?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureIceBreakContext} ctx */
export function notifyOwnedTreasuresOnIceBreak(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    TREASURE_HOOKS_BY_ID.get(id)?.onIceMaterialBreak?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureBossRestrictionContext} ctx */
export function notifyOwnedTreasuresOnBossRestrictionTriggered(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    TREASURE_HOOKS_BY_ID.get(id)?.onBossRestrictionTriggered?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds @param {import('./treasureTypes.js').TreasureDeckCardsAddedContext} ctx */
export function notifyOwnedTreasuresOnDeckCardsAdded(ownedSlotTreasureIds, ctx) {
  const seen = new Set();
  for (const id of ownedSlotTreasureIds) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    TREASURE_HOOKS_BY_ID.get(id)?.onDeckCardsAdded?.(ctx);
  }
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function sumTreasureSubmitLengthBonus(ownedSlotTreasureIds) {
  const slots = ownedSlotTreasureIds ?? [];
  let sum = 0;
  const seen = new Set();
  for (const id of slots) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    const fn = TREASURE_HOOKS_BY_ID.get(id)?.getSubmitLengthBonus;
    if (!fn) continue;
    sum += Math.max(0, Math.floor(Number(fn({ ownedSlotTreasureIds: slots })) || 0));
  }
  return sum;
}

/** @param {(string | null | undefined)[]} ownedSlotTreasureIds */
export function sumTreasureLengthJudgmentPenalty(ownedSlotTreasureIds) {
  const slots = ownedSlotTreasureIds ?? [];
  let sum = 0;
  const seen = new Set();
  for (const id of slots) {
    if (id == null || id === "" || seen.has(id)) continue;
    seen.add(id);
    const fn = TREASURE_HOOKS_BY_ID.get(id)?.getLengthJudgmentPenalty;
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
