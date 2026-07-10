import { describe, mult, prob, riskBlock, riskText } from "../treasureDescription.js";
import { isTreasureHookBlueprintMirror } from "../../game/treasureBlueprintMirror.js";
import { rollProbabilityFailsSkip } from "../treasureProbability.js";

const ID = "54";
const ERUPTION_PROB_DENOMINATOR = 20;

/** @param {import('../treasureTypes.js').TreasurePatchDescriptionContext} ctx */
function buildVolcanoDescription(ctx) {
  const erupted = ctx.treasureRun?.volcano54Erupted === true;
  if (erupted) {
    return describe(
      mult("x5"),
      "倍率",
      "；",
      prob("1/20"),
      "的概率在关卡完成时喷发",
      { type: "br" },
      riskText("（已喷发）"),
    );
  }
  return describe(
    mult("x5"),
    "倍率",
    "；",
    prob("1/20"),
    "的概率在关卡完成时喷发",
    { type: "br" },
    riskBlock("…火焰会吞没", riskText("一切"), "！"),
  );
}

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 9,
  rarity: "epic",
  description: describe(
    mult("x5"),
    "倍率",
    "；",
    prob("1/20"),
    "的概率在关卡完成时喷发",
    { type: "br" },
    riskBlock("…火焰会吞没", riskText("一切"), "！"),
  ),
  poolPrerequisite: { type: "treasure29SelfDestructed" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  replaceDescriptionWithPatch: true,
  patchDescription(ctx) {
    return buildVolcanoDescription(ctx);
  },
  resolveVolcanoEruptionBubble() {
    return { text: "火山喷发！", kind: "volcano-eruption" };
  },
  buildPostLetterStep() {
    return { multMul: 5 };
  },
  async onLevelComplete(ctx) {
    if (isTreasureHookBlueprintMirror(ctx)) return;
    if (ctx.treasureRun?.volcano54Erupted) return;
    const rng = ctx.rng ?? Math.random;
    if (rollProbabilityFailsSkip(1, ERUPTION_PROB_DENOMINATOR, rng, ctx.ownedSlotTreasureIds)) return;
    const volcanoSlotIndex =
      typeof ctx.hookSlotIndex === "number" && ctx.hookSlotIndex >= 0
        ? ctx.hookSlotIndex
        : (ctx.findOwnedTreasureSlotIndex?.(ID) ?? -1);
    if (volcanoSlotIndex < 0) return;
    if (ctx.treasureRun) {
      ctx.treasureRun.probabilityEffectTriggered = true;
      ctx.treasureRun.volcano54Erupted = true;
    }
    await ctx.playVolcanoEruptionAtSlot?.(volcanoSlotIndex);
  },
};
