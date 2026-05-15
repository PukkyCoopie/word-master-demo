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
