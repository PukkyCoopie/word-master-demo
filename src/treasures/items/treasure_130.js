import { describe, prob } from "../treasureDescription.js";
import { isConsonantLetterWithMask } from "../treasureLetterClassify.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";
import { applyPlainMaterialToTile } from "../../game/tileMaterialApply.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe("辅音字母在计分时有", prob("1/2"), "的概率会变为黄金块"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  preprocessSubmitScoringTiles(ctx) {
    const slots = ctx.ownedSlotTreasureIds ?? [];
    const rnd = typeof ctx.rng === "function" ? ctx.rng : Math.random;
    for (const tile of ctx.tiles ?? []) {
      if (!tile || typeof tile !== "object") continue;
      const letter = String(tile.letter ?? "").trim();
      if (!letter || !isConsonantLetterWithMask(letter, slots)) continue;
      if (!rollProbabilitySuccess(1, 2, rnd, slots)) continue;
      applyPlainMaterialToTile(/** @type {Record<string, unknown>} */ (tile), "gold");
    }
  },
};
