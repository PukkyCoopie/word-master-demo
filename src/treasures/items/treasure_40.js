import { dictionaryPosMatchesTreasureLevelKey } from "../../game/wordPosMatch.js";
import { describe, mult } from "../treasureDescription.js";
import { bankMultAddGain, getMultAddBank } from "../treasureBankHelpers.js";

const ID = "40";

/**
 * @param {{ resolvedWord?: string, getWordDefinition?: (word: string) => { pos?: string } | null | undefined }} ctx
 */
function isNonNounSubmittedWord(ctx) {
  const word = String(ctx.resolvedWord ?? "").toLowerCase().trim();
  if (!word) return false;
  const def = ctx.getWordDefinition?.(word);
  return !dictionaryPosMatchesTreasureLevelKey(def?.pos, "n");
}

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function buildBookDescription(ctx) {
  const v = getMultAddBank(ctx.treasureRun, ID);
  return describe(
    "每当你拼写出一个不是名词的单词，获得",
    mult("+2"),
    "倍率",
    "（当前",
    mult(v >= 0 ? `+${v}` : String(v)),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "common",
  description: describe(
    "每当你拼写出一个不是名词的单词，获得",
    mult("+2"),
    "倍率",
    "（当前",
    mult("+0"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription: buildBookDescription,
  buildPostLetterStep(ctx) {
    const v = getMultAddBank(ctx.treasureRun, ID);
    return v !== 0 ? { multAdd: v } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    if (!isNonNounSubmittedWord(ctx)) return;
    await bankMultAddGain(ctx, ID, 2);
  },
};
