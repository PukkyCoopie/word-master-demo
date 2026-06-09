import { describe } from "../treasureDescription.js";

const RETRIGGER_LETTERS = new Set(["a", "b", "c", "d", "e"]);

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("重新触发所有A,B,C,D,E"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  getLetterReplayCountForLetter(_ctx, part) {
    const letter = String(part?.letter ?? "").toLowerCase();
    return RETRIGGER_LETTERS.has(letter) ? 1 : 0;
  },
};
