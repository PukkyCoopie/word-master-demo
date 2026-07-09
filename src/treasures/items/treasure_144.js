import { describe, materialConcept } from "../treasureDescription.js";
import { applyPlainMaterialToTile } from "../../game/tileMaterialApply.js";
import { pickRandomFountainWaterTarget } from "../../game/fountainWaterTargets.js";
import { wobbleTreasureHookContributor } from "../treasureBankHelpers.js";

const ID = "144";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe(
    "在你拼写一个单词后，使棋盘上一个随机字母块变为",
    materialConcept("water"),
  ),
};

/** @param {import('../treasureTypes.js').TreasureSubmitSuccessContext} ctx */
async function applyFountainWaterState(ctx) {
  const grid = ctx.getGrid?.();
  const rng = typeof ctx.rng === "function" ? ctx.rng : Math.random;
  const target = pickRandomFountainWaterTarget(grid, rng);
  if (!target) return;
  const { row, col } = target;
  const tile = ctx.getGrid?.()?.[row]?.[col];
  if (!tile || typeof tile !== "object") return;
  applyPlainMaterialToTile(/** @type {Record<string, unknown>} */ (tile), "water");
  ctx.touchGrid?.();
  ctx.noteCollectionMaterialAcquired?.("water");
}

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    if (ctx.skipSettlementFx === true) {
      await applyFountainWaterState(ctx);
      return;
    }
    const runFx = async () => {
      const grid = ctx.getGrid?.();
      const rng = typeof ctx.rng === "function" ? ctx.rng : Math.random;
      const target = pickRandomFountainWaterTarget(grid, rng);
      if (!target) return;
      await wobbleTreasureHookContributor(ctx, ID);
      const { row, col } = target;
      await ctx.playGridTileMaterialChangeAtCell?.(row, col, () => {
        const tile = ctx.getGrid?.()?.[row]?.[col];
        if (!tile || typeof tile !== "object") return;
        applyPlainMaterialToTile(/** @type {Record<string, unknown>} */ (tile), "water");
      });
      ctx.touchGrid?.();
      ctx.noteCollectionMaterialAcquired?.("water");
    };
    if (typeof ctx.registerSubmitPostScoreClearFx === "function") {
      ctx.registerSubmitPostScoreClearFx(runFx);
      return;
    }
    await runFx();
  },
};
