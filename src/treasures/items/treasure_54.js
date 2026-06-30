import { describe, mult, prob, riskBlock, riskText } from "../treasureDescription.js";
import { isTreasureHookBlueprintMirror } from "../../game/treasureBlueprintMirror.js";
import { rollProbabilityFailsSkip } from "../treasureProbability.js";

const ID = "54";
const ERUPTION_PROB_DENOMINATOR = 25;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 10,
  rarity: "epic",
  description: describe(
    mult("x5"),
    "倍率",
    "；",
    prob("1/25"),
    "的概率在关卡完成时喷发",
    { type: "br" },
    riskBlock("…火焰会吞没", riskText("一切"), "！"),
  ),
  poolPrerequisite: { type: "treasure29SelfDestructed" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  resolveVolcanoEruptionBubble() {
    return { text: "火山喷发！", kind: "volcano-eruption" };
  },
  buildPostLetterStep() {
    return { multMul: 5 };
  },
  async onLevelComplete(ctx) {
    if (isTreasureHookBlueprintMirror(ctx)) return;
    const rng = ctx.rng ?? Math.random;
    if (rollProbabilityFailsSkip(1, ERUPTION_PROB_DENOMINATOR, rng, ctx.ownedSlotTreasureIds)) return;
    if (ctx.treasureRun) ctx.treasureRun.probabilityEffectTriggered = true;
    const volcanoSlotIndex =
      typeof ctx.hookSlotIndex === "number" && ctx.hookSlotIndex >= 0
        ? ctx.hookSlotIndex
        : (ctx.findOwnedTreasureSlotIndex?.(ID) ?? -1);
    if (volcanoSlotIndex < 0) return;
    await ctx.playVolcanoEruptionAtSlot?.(volcanoSlotIndex);
  },
};
