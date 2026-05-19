import { dictionaryPosMatchesTreasureLevelKey } from "../../game/wordPosMatch.js";
import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "common",
  description: describe("每当你拼写出一个不是名词的单词，获得", mult("+1"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const word = String(ctx.resolvedWord ?? "").toLowerCase().trim();
    if (!word) return null;
    const def = ctx.getWordDefinition?.(word);
    if (dictionaryPosMatchesTreasureLevelKey(def?.pos, "n")) return null;
    return { multAdd: 1 };
  },
};
