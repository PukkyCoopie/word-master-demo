import { describe, mult } from "../treasureDescription.js";
import { resolveTreasureHookAnimSlotIndex } from "../../game/treasureBlueprintMirror.js";
import { recomputeSubmitDetailedAfterPagerStep } from "../treasureScoring.js";
import { playTreasureHookBubbleFx } from "../treasureBankHelpers.js";

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
  resolveWordDefinitionTriggerMode(ctx) {
    if (ctx.displayMode === "definition") {
      return { triggerMode: "button" };
    }
  },
  async onWordDefinitionOpenAttempt(ctx) {
    await playTreasureHookBubbleFx(ctx, ID, "不行哦", "destroy");
    return { blocked: true };
  },
  async runAfterLettersBeforePostSteps(ctx) {
    // 翻译测验是计分状态变更，不是可跳过的结算装饰动效；skipSettlementFx 时仍须执行。
    const session = ctx.pagerQuizSession;
    if (!session?.options?.length) return;

    const slotIndex = resolveTreasureHookAnimSlotIndex(ctx) ?? -1;
    if (slotIndex < 0) return;

    const detailed = ctx.detailed;
    if (!detailed || !Array.isArray(detailed.postLetterTreasureSteps)) return;

    /** @type {{ correct?: boolean, skipped?: boolean } | undefined} */
    let result = detailed._pagerQuizSubmitResult;
    if (result == null) {
      result = await ctx.requestPagerQuiz?.({
        treasureId: ID,
        slotIndex,
        session,
      });
      if (!result || result.skipped) return;
      detailed._pagerQuizSubmitResult = result;
    } else {
      result = await ctx.requestPagerQuiz?.({
        treasureId: ID,
        slotIndex,
        reuseResult: result,
      });
      if (!result || result.skipped) return;
    }

    const multMul = result.correct ? MULT_CORRECT : MULT_WRONG;
    detailed.postLetterTreasureSteps.push({
      treasureId: ID,
      slotIndex,
      multMul,
    });
    recomputeSubmitDetailedAfterPagerStep(detailed);
  },
};
