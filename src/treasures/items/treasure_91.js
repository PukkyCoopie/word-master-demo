import { describe, money, mult, materialConcept } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe(materialConcept("gold"), "在计分时提供", money("4"), "和", mult("+10"), "倍率"),
  poolPrerequisite: { type: "playedAllGoldWord" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const parts = ctx.letterParts ?? [];
    let gold = 0;
    for (const p of parts) {
      if (String(p?.materialId ?? "") === "gold") gold += 1;
    }
    if (gold <= 0) return null;
    return { moneyAdd: gold * 4, multAdd: gold * 10 };
  },
};
