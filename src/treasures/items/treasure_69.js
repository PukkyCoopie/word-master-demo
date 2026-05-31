import { describe, mult } from "../treasureDescription.js";

const ID = "69";

/**
 * @param {object[] | null | undefined} instances
 * @returns {number}
 */
function sumOtherTreasureSellPriceHalves(instances) {
  const slots = instances ?? [];
  let sum = 0;
  for (const t of slots) {
    if (!t || String(t.treasureId) === ID) continue;
    sum += Math.max(0, Math.floor(Number(t.price) / 2) || 0);
  }
  return sum;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe("将其他宝藏的售卖价格之和添加至倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  patchDescription(ctx) {
    const sum = sumOtherTreasureSellPriceHalves(ctx.ownedTreasureInstances);
    return describe("（当前", mult(`+${sum}`), "）");
  },
  buildPostLetterStep(ctx) {
    const sum = sumOtherTreasureSellPriceHalves(ctx.ownedTreasureInstances);
    return sum > 0 ? { multAdd: sum } : null;
  },
};
