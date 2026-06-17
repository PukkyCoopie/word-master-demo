import { dictionaryPosMatchesTreasureLevelKey } from "../../game/wordPosMatch.js";
import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 8,
  rarity: "epic",
  unlockPrerequisite: { type: "chapterNoVerbSpelled" },
  description: describe("如果拼写的单词是动词，", mult("x3"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep(ctx) {
    const word = String(ctx.resolvedWord ?? "").toLowerCase().trim();
    if (!word) return null;
    const def = ctx.getWordDefinition?.(word);
    if (!dictionaryPosMatchesTreasureLevelKey(def?.pos, "v", def?.translation_zh)) return null;
    return { multMul: 3 };
  },
};
