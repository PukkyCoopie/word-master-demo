import { describe, mult, rarity } from "../treasureDescription.js";
import { getTreasureDef } from "../treasureRegistry.js";

const ID = "138";

/** @type {Readonly<Record<string, number>>} */
const MULT_BY_RARITY = Object.freeze({
  epic: 1.25,
  legendary: 1.75,
});

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  description: describe(
    "你的其他",
    rarity("史诗"),
    "和",
    rarity("传说"),
    "宝藏分别提供",
    mult("x1.25"),
    "/",
    mult("x1.75"),
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
      const m = MULT_BY_RARITY[rarity];
      if (m) product *= m;
    }
    return product > 1 ? { multMul: product } : null;
  },
};
