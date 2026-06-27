import { describe, prob } from "../treasureDescription.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";

const ID = "135";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("在你打开一个组合包后，有", prob("1/2"), "的概率再使用一张随机法术"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onPackClaimed(ctx) {
    const rnd = typeof ctx.rng === "function" ? ctx.rng : Math.random;
    if (!rollProbabilitySuccess(1, 2, rnd, ctx.ownedSlotTreasureIds)) return;
    const slotIx = ctx.findOwnedTreasureSlotIndex?.(ID) ?? -1;
    await ctx.requestInRunSpellGrant?.({
      treasureId: ID,
      treasureSlotIndex: slotIx >= 0 ? slotIx : undefined,
    });
  },
};
