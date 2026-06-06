import { describe, mult } from "../treasureDescription.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const JK = new Set(["j", "k"]);

/** @param {import('../treasureTypes.js').TreasureLogicContext} ctx */
function collectJkGridIndices(ctx) {
  const grid = ctx.grid;
  const rows = Math.max(0, Math.floor(Number(ctx.gridRows) || 0));
  const cols = Math.max(0, Math.floor(Number(ctx.gridCols) || 0));
  if (!Array.isArray(grid) || rows <= 0 || cols <= 0) return [];

  /** @type {number[]} */
  const indices = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = grid[r]?.[c];
      if (!t?.letter) continue;
      if (t.bossTileDebuffed === true) continue;
      const ch = normalizeLetterChar(t.letter);
      if (JK.has(ch)) indices.push(r * cols + c);
    }
  }
  return indices;
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  unlockPrerequisite: { type: "levelAllFiveVowels" },
  description: describe("每一个棋盘上的J和K提供", mult("+10"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  collectPostLetterSteps(ctx) {
    const indices = collectJkGridIndices(ctx);
    if (!indices.length) return null;
    return indices.map((scoreFxGridTileIndex) => ({ multAdd: 10, scoreFxGridTileIndex }));
  },
};
