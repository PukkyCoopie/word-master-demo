import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "rare",
  description: describe("随机", mult("+0-26"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const rnd = typeof ctx?.rng === "function" ? ctx.rng : Math.random;
    return { multAdd: Math.floor(rnd() * 27) };
  },
};
