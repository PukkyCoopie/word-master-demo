import { describe, mult } from "../treasureDescription.js";
import { getTreasureDef } from "../treasureRegistry.js";

const ID = "138";

/** @type {Readonly<Record<string, number>>} */
const MULT_BY_RARITY = Object.freeze({
  common: 1.06,
  rare: 1.125,
  epic: 1.25,
  legendary: 1.5,
});

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe(
    "你的其他宝藏还会根据自身稀有度，分别提供",
    mult("x1.06"),
    "/",
    mult("x1.125"),
    "/",
    mult("x1.25"),
    "/",
    mult("x1.5"),
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const slots = ctx.ownedSlotTreasureIds ?? [];
    let product = 1;
    for (const raw of slots) {
      const tid = String(raw ?? "").trim();
      if (!tid || tid === ID) continue;
      const def = getTreasureDef(tid);
      const rarity = def?.rarity ?? "common";
      const m = MULT_BY_RARITY[rarity] ?? 1;
      if (m > 1) product *= m;
    }
    return product > 1 ? { multMul: product } : null;
  },
};
