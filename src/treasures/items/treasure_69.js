import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("将其他宝藏的售卖价格之和添加至倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const slots = ctx.ownedTreasureInstances ?? [];
    let sum = 0;
    for (const t of slots) {
      if (!t || String(t.treasureId) === "69") continue;
      sum += Math.max(0, Math.floor(Number(t.price) / 2) || 0);
    }
    return sum > 0 ? { multAdd: sum } : null;
  },
};
