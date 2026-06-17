import { dictionaryPosIsExclusivelyTreasureLevelKey } from "../../game/wordPosMatch.js";
import { shouldTreasureRunAccumulationMutate } from "../../game/treasureBlueprintMirror.js";
import { describe, mult } from "../treasureDescription.js";
import { addMultAddBank, getMultAddBank, patchCurrentBankDescription } from "../treasureBankHelpers.js";

const ID = "40";

/**
 * @param {{ resolvedWord?: string, getWordDefinition?: (word: string) => { pos?: string } | null | undefined }} ctx
 */
function isNonNounSubmittedWord(ctx) {
  const word = String(ctx.resolvedWord ?? "").toLowerCase().trim();
  if (!word) return false;
  const def = ctx.getWordDefinition?.(word);
  return !dictionaryPosIsExclusivelyTreasureLevelKey(def?.pos, "n");
}

/**
 * @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx
 */
function buildBookDescription(ctx) {
  const v = getMultAddBank(ctx.treasureRun, ID);
  return describe(
    "每当你拼写出一个不是名词的单词，获得",
    mult("+3"),
    "倍率",
    "（当前",
    mult(v >= 0 ? `+${v}` : String(v)),
    "）",
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe(
    "每当你拼写出一个不是名词的单词，获得",
    mult("+3"),
    "倍率",
    "（当前",
    mult("+0"),
    "）",
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  ...patchCurrentBankDescription(ID, "multAdd"),
  replaceDescriptionWithPatch: true,
  patchDescription: buildBookDescription,
  buildPostLetterStep(ctx) {
    const base = getMultAddBank(ctx.treasureRun, ID);
    const pendingGain = isNonNounSubmittedWord(ctx) ? 3 : 0;
    const total = base + pendingGain;
    return total !== 0 ? { multAdd: total } : null;
  },
  async onSuccessfulWordSubmit(ctx) {
    if (!isNonNounSubmittedWord(ctx)) return;
    const slotIx = Math.max(0, Math.floor(Number(ctx.hookSlotIndex) || 0));
    const source = ctx.hookSource ?? "self";
    const owned = ctx.ownedSlotTreasureIds ?? [];
    if (shouldTreasureRunAccumulationMutate(owned, slotIx, ID, source)) {
      addMultAddBank(ctx.treasureRun, ID, 3);
    }
    await ctx.playTreasureMultDeltaFxAtSlot?.(slotIx, 3);
  },
};
