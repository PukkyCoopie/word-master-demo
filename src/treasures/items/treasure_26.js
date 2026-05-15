import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("你每有一个宝藏，", mult("+4"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const count = (ctx.ownedSlotTreasureIds ?? []).filter((id) => id != null && id !== "").length;
    return count > 0 ? { multAdd: count * 4 } : null;
  },
};
