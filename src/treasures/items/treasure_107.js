import { describe, mult } from "../treasureDescription.js";
import { resolveGridEffectTriggerCount } from "../../game/gridEffectTriggerCount.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const JK = new Set(["j", "k"]);

/** @param {import('../treasureTypes.js').TreasureLogicContext} ctx */
function collectJkGridCells(ctx) {
  const grid = ctx.grid;
  const rows = Math.max(0, Math.floor(Number(ctx.gridRows) || 0));
  const cols = Math.max(0, Math.floor(Number(ctx.gridCols) || 0));
  if (!Array.isArray(grid) || rows <= 0 || cols <= 0) return [];
  const excluded = ctx.submitExcludedGridPositionKeys;

  /** @type {{ index: number, tile: object }[]} */
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (excluded?.has(`${r},${c}`)) continue;
      const t = grid[r]?.[c];
      if (!t?.letter) continue;
      if (t.bossTileDebuffed === true) continue;
      const ch = normalizeLetterChar(t.letter);
      if (JK.has(ch)) cells.push({ index: r * cols + c, tile: t });
    }
  }
  return cells;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  unlockPrerequisite: { type: "levelAllFiveVowels" },
  description: describe("每一个棋盘上的J和K提供", mult("x2"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  collectPostLetterSteps(ctx) {
    const owned = ctx.ownedSlotTreasureIds ?? [];
    const cells = collectJkGridCells(ctx);
    if (!cells.length) return null;
    /** @type {{ multMul: number, scoreFxGridTileIndex: number, accessoryTriggered?: boolean }[]} */
    const steps = [];
    for (const { index, tile } of cells) {
      const triggerCount = resolveGridEffectTriggerCount(tile, owned);
      for (let k = 0; k < triggerCount; k++) {
        steps.push({
          multMul: 2,
          scoreFxGridTileIndex: index,
          accessoryTriggered: k > 0,
        });
      }
    }
    return steps.length ? steps : null;
  },
};
