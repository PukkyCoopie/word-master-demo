import { describe, mult } from "../treasureDescription.js";
import { syncTileStateToDeckCard } from "../../game/deckCardSync.js";
import { applyFireMaterialToTile } from "../../game/tileMaterialApply.js";
import { collectFireworkIgniteTargets, isNoMaterialLetterTile } from "../../game/fireworkIgniteTargets.js";

const ID = "129";
const FIREWORK_IGNITE_MULT_BONUS = 10;

/** @param {Record<string, unknown>} tile */
export function applyFireworkIgniteToTile(tile) {
  applyFireMaterialToTile(tile);
  tile.letterMultBonus =
    Math.max(0, Math.round(Number(tile.letterMultBonus) || 0)) + FIREWORK_IGNITE_MULT_BONUS;
  syncTileStateToDeckCard(tile);
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  unlockPrerequisite: { type: "deckFireMin", min: 2 },
  description: describe(
    "在每次拼写后，火焰块会引燃上方的无材质字母块并使其获得",
    mult("+10"),
    "倍率",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const grid = ctx.getGrid?.();
    const targets = collectFireworkIgniteTargets(grid);
    if (!targets.length) return;
    await ctx.wobbleOwnedTreasureById?.(ID);
    let changed = false;
    for (const { row, col } of targets) {
      const above = grid?.[row]?.[col];
      if (!isNoMaterialLetterTile(above)) continue;
      await ctx.playGridTileIgniteFxAtCell?.(row, col, () => {
        const tile = grid?.[row]?.[col];
        if (!tile || typeof tile !== "object") return;
        applyFireworkIgniteToTile(/** @type {Record<string, unknown>} */ (tile));
      });
      changed = true;
    }
    if (changed) ctx.touchGrid?.();
  },
};

export { collectFireworkIgniteTargets } from "../../game/fireworkIgniteTargets.js";
