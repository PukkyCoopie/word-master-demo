import { describe, mult } from "../treasureDescription.js";

function chairTimesMultFromOwnedSlots(ownedSlotTreasureIds) {
  const slots = Array.isArray(ownedSlotTreasureIds) ? ownedSlotTreasureIds : [];
  const emptySlotCount = slots.filter((id) => id == null || id === "").length;
  return Math.max(1, emptySlotCount);
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe("你每有一个空的宝藏槽位便获得", mult("x1"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    return { multMul: chairTimesMultFromOwnedSlots(ctx.ownedSlotTreasureIds) };
  },
};
