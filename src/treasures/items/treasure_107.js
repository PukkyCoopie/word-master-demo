import { describe, mult } from "../treasureDescription.js";
import { normalizeLetterChar } from "../treasureLifecycleShared.js";

const JK = new Set(["j", "k"]);

/** @param {readonly { letter?: string }[] | null | undefined} tiles */
function countJkOnGrid(tiles) {
  let n = 0;
  for (const t of tiles ?? []) {
    const ch = normalizeLetterChar(t?.letter);
    if (JK.has(ch)) n += 1;
  }
  return n;
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
  buildPostLetterStep(ctx) {
    const n = countJkOnGrid(ctx.gridTiles);
    if (n <= 0) return null;
    return { multAdd: n * 10 };
  },
};
