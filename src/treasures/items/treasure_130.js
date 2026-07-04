import { describe, materialConcept, prob } from "../treasureDescription.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";
import { applyPlainMaterialToTile } from "../../game/tileMaterialApply.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("字母在计分后有", prob("1/3"), "的概率会变为", materialConcept("gold")),
};

/**
 * @param {object[]} targets
 * @param {import('../treasureTypes.js').TreasurePerLetterPostScoringMaterialFxContext} ctx
 * @param {object | null} realForFreeze
 */
function applyGoldToSubmitTiles(targets, ctx, realForFreeze) {
  for (const t of targets) {
    if (!t || typeof t !== "object") continue;
    applyPlainMaterialToTile(/** @type {Record<string, unknown>} */ (t), "gold");
  }
  if (realForFreeze) ctx.patchGridPlaceholderFreezeFromTile?.(realForFreeze);
}

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async runPerLetterPostScoringMaterialFx(ctx, _part, letterIndex, scoringTile) {
    const slots = ctx.ownedSlotTreasureIds ?? [];
    const real = ctx.resolveSubmitTileAtIndex?.(letterIndex, scoringTile) ?? null;
    const materialCheck = real ?? scoringTile;
    if (!materialCheck || typeof materialCheck !== "object") return;
    if (!String(materialCheck.letter ?? "").trim()) return;
    if (String(materialCheck.materialId ?? "") === "gold") return;

    const rnd = typeof ctx.rng === "function" ? ctx.rng : Math.random;
    if (!rollProbabilitySuccess(1, 3, rnd, slots)) return;

    /** @type {object[]} */
    const targets = [];
    if (real && typeof real === "object") targets.push(real);
    if (scoringTile && typeof scoringTile === "object" && scoringTile !== real) targets.push(scoringTile);
    if (!targets.length) return;

    const applyGold = () => applyGoldToSubmitTiles(targets, ctx, real);
    const play = ctx.playGridTileMaterialChangeForSubmitWordSlot;
    if (play) {
      await play(letterIndex, applyGold);
      return;
    }
    applyGold();
  },
};
