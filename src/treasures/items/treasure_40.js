import { dictionaryPosMatchesTreasureLevelKey } from "../../game/wordPosMatch.js";
import { describe, mult } from "../treasureDescription.js";
import { addMultAddBank, getMultAddBank } from "../treasureBankHelpers.js";

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
    const base = getMultAddBank(ctx.treasureRun, ID);
    const pendingGain = isNonNounSubmittedWord(ctx) ? 2 : 0;
    const total = base + pendingGain;
    return total !== 0 ? { multAdd: total } : null;
  },
  onSuccessfulWordSubmit(ctx) {
    if (!isNonNounSubmittedWord(ctx)) return;
    // 不再单独播 +2 气泡：只在字后步展示“总倍率”气泡。
    addMultAddBank(ctx.treasureRun, ID, 2);
  },
};
