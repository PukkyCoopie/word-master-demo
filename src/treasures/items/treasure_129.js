import { describe, mult } from "../treasureDescription.js";
import { syncTileStateToDeckCard } from "../../game/deckCardSync.js";
import { gridTileHasMaterial } from "../../game/volcanoEruptionTargets.js";

const ID = "129";

/** @param {unknown} tile */
function isNoMaterialLetterTile(tile) {
  if (!tile || typeof tile !== "object") return false;
  const t = /** @type {{ letter?: string, bossGridBlocked?: boolean }} */ (tile);
  if (!String(t.letter ?? "").trim()) return false;
  if (t.bossGridBlocked === true) return false;
  return !gridTileHasMaterial(tile);
}

/** @param {unknown} tile */
function isFireGridTile(tile) {
  if (!tile || typeof tile !== "object") return false;
  return String(/** @type {{ materialId?: unknown }} */ (tile).materialId ?? "").trim() === "fire";
}

/**
 * 遍历整盘 grid：每个火焰格（含已选入拼词、仍留 placeholder 的格）引燃正上方无材质字母块。
 * @param {object[][] | null | undefined} grid
 * @returns {{ row: number, col: number }[]}
 */
export function collectFireworkIgniteTargets(grid) {
  /** @type {{ row: number, col: number }[]} */
  const targets = [];
  if (!Array.isArray(grid)) return targets;
  for (let row = 0; row < grid.length; row += 1) {
    const rowArr = grid[row];
    if (!Array.isArray(rowArr)) continue;
    for (let col = 0; col < rowArr.length; col += 1) {
      if (!isFireGridTile(rowArr[col])) continue;
      const aboveRow = row - 1;
      if (aboveRow < 0) continue;
      const above = grid[aboveRow]?.[col];
      if (!isNoMaterialLetterTile(above)) continue;
      targets.push({ row: aboveRow, col });
    }
  }
  return targets;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  unlockPrerequisite: { type: "deckFireMin", min: 2 },
  description: describe(
    "在每次拼写后，你的火焰块能够引燃上方的无材质字母块并使其获得",
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
    let changed = false;
    for (const { row, col } of targets) {
      const above = grid?.[row]?.[col];
      if (!isNoMaterialLetterTile(above)) continue;
      above.letterMultBonus = Math.max(0, Math.floor(Number(above.letterMultBonus) || 0)) + 10;
      syncTileStateToDeckCard(above);
      changed = true;
      await ctx.playOwnedTreasureMultDeltaFx?.(ID, 10);
    }
    if (changed) ctx.touchGrid?.();
  },
};
