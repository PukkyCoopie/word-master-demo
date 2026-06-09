import { describe, mult } from "../treasureDescription.js";

function chairTimesMultFromOwnedSlots(ownedSlotTreasureIds) {
  const slots = Array.isArray(ownedSlotTreasureIds) ? ownedSlotTreasureIds : [];
  const emptySlotCount = slots.filter((id) => id == null || id === "").length;
  return Math.max(1, emptySlotCount);
}

function resolveChairTimesMultFromPatchContext(ctx) {
  const slots = Array.isArray(ctx?.ownedSlotTreasureIds) ? ctx.ownedSlotTreasureIds : null;
  if (slots?.length) return chairTimesMultFromOwnedSlots(slots);
  const ownedCount = Array.isArray(ctx?.ownedTreasureInstances) ? ctx.ownedTreasureInstances.length : 0;
  const fallbackSlots = Math.max(0, 5 - ownedCount);
  return Math.max(1, fallbackSlots);
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 7,
  rarity: "rare",
  description: describe("你每有一个空的宝藏槽位便", mult("x1"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  patchDescription(ctx) {
    const m = resolveChairTimesMultFromPatchContext(ctx);
    return describe("（当前", mult(`x${m}`), "）");
  },
  buildPostLetterStep(ctx) {
    const m = chairTimesMultFromOwnedSlots(ctx.ownedSlotTreasureIds);
    return m > 1 ? { multMul: m } : null;
  },
};
