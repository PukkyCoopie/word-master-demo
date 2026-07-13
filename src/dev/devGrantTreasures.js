import { getTreasureDef } from "../treasures/treasureRegistry.js";

/**
 * 开发者模式：按 id 授予宝藏；槽位满时可选裁剪配饰扩栏。
 * @param {string} treasureId
 * @param {{
 *   getOwnedTreasures: () => unknown[],
 *   setOwnedTreasures: (slots: unknown[]) => void,
 *   findTreasurePlacementIndex: (offer: { treasureAccessoryIds?: string[] } | null | undefined) => number,
 *   buildOwnedTreasureSlot: (input: Record<string, unknown>) => unknown,
 *   noteCollectionTreasureAcquired: (id: string) => void,
 *   initTreasureBankOnAcquire: (id: string, runState: unknown) => void,
 *   applyTreasureAcquireImmediateEffectsForRun: (id: string) => void,
 *   getTreasureRunState: () => unknown,
 *   accessoryCropId: string,
 *   expandWithCropWhenFull?: boolean,
 * }} deps
 * @returns {{ ok: boolean, slotIndex: number, treasureId: string, usedCrop: boolean }}
 */
export function grantDevOwnedTreasureById(treasureId, deps) {
  const tid = String(treasureId ?? "").trim();
  const def = getTreasureDef(tid);
  if (!def) return { ok: false, slotIndex: -1, treasureId: tid, usedCrop: false };

  const expandWithCropWhenFull = deps.expandWithCropWhenFull !== false;
  let usedCrop = false;
  let ix = deps.findTreasurePlacementIndex(null);
  if (ix < 0 && expandWithCropWhenFull) {
    ix = deps.findTreasurePlacementIndex({ treasureAccessoryIds: [deps.accessoryCropId] });
    if (ix >= 0) usedCrop = true;
  }
  if (ix < 0) return { ok: false, slotIndex: -1, treasureId: tid, usedCrop: false };

  const slots = [...deps.getOwnedTreasures()];
  slots[ix] = deps.buildOwnedTreasureSlot({
    treasureId: def.treasureId,
    price: def.price,
    ...(usedCrop ? { treasureAccessoryIds: [deps.accessoryCropId] } : {}),
  });
  deps.setOwnedTreasures(slots);
  deps.noteCollectionTreasureAcquired(def.treasureId);
  deps.initTreasureBankOnAcquire(def.treasureId, deps.getTreasureRunState(), slots[ix]);
  deps.applyTreasureAcquireImmediateEffectsForRun(def.treasureId);
  return { ok: true, slotIndex: ix, treasureId: tid, usedCrop };
}

/**
 * @param {readonly string[]} treasureIds
 * @param {Parameters<typeof grantDevOwnedTreasureById>[1]} deps
 */
export function grantDevOwnedTreasuresByIds(treasureIds, deps) {
  /** @type {ReturnType<typeof grantDevOwnedTreasureById>[]} */
  const results = [];
  for (const id of treasureIds ?? []) {
    results.push(grantDevOwnedTreasureById(id, deps));
  }
  return results;
}
