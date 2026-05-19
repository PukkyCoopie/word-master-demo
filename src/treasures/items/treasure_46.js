import { describe, mult } from "../treasureDescription.js";
import { countBigramOccurrencesInWord, ensureBigramTargetPair } from "../../game/treasureBigramRoll.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("每一个拼出的双字母组合提供", mult("x2"), "倍率"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    const pair = String(
      ensureBigramTargetPair(ctx.treasureRun, ctx.rollRandomBigram) ?? "??",
    ).toUpperCase();
    return describe(`每一个拼出的${pair}提供`, mult("x2"), "倍率");
  },
  buildPostLetterStep(ctx) {
    const pair = ctx.treasureRun?.bigramTargetPair;
    const word = String(ctx.resolvedWord ?? "");
    if (!pair || !word) return null;
    const hits = countBigramOccurrencesInWord(word, pair);
    if (hits <= 0) return null;
    let m = 1;
    for (let i = 0; i < hits; i += 1) m *= 2;
    return { multMul: m };
  },
  getPerLetterMultCue(ctx, _part, letterIndex) {
    const pair = ctx.treasureRun?.bigramTargetPair;
    const word = String(ctx.resolvedWord ?? "").toLowerCase();
    if (!pair || pair.length !== 2 || letterIndex < 1) return null;
    const i = letterIndex;
    if (word[i - 1] === pair[0] && word[i] === pair[1]) {
      return { delta: 2, label: "x2" };
    }
    return null;
  },
  onSuccessfulWordSubmit(ctx) {
    ensureBigramTargetPair(ctx.treasureRun, ctx.rollRandomBigram);
  },
};
