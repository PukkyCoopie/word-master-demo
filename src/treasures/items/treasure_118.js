import { describe, mult } from "../treasureDescription.js";
import { recomputeSubmitDetailedAfterPagerStep } from "../treasureScoring.js";

export const TREASURE_118_ID = "118";
const ID = TREASURE_118_ID;
const MULT_CORRECT = 2.5;
const MULT_WRONG = 0.75;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "rare",
  description: describe(
    "从4个选项中选择一个正确的翻译以",
    mult("x2.5"),
    "倍率，错误则",
    mult("x0.75"),
  ),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep() {
    return null;
  },
  async runAfterLettersBeforePostSteps(ctx) {
    const session = ctx.pagerQuizSession;
    if (!session?.options?.length) return;

    const slotIndex =
      typeof ctx.findOwnedTreasureSlotIndex === "function"
        ? ctx.findOwnedTreasureSlotIndex(ID)
        : -1;
    if (slotIndex < 0) return;

    const result = await ctx.requestPagerQuiz?.({
      treasureId: ID,
      session,
    });
    if (!result || result.skipped) return;

    const multMul = result.correct ? MULT_CORRECT : MULT_WRONG;
    const detailed = ctx.detailed;
    if (!detailed || !Array.isArray(detailed.postLetterTreasureSteps)) return;

    detailed.postLetterTreasureSteps.push({
      treasureId: ID,
      slotIndex,
      multMul,
    });
    recomputeSubmitDetailedAfterPagerStep(detailed);
  },
};
