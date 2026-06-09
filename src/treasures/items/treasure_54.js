import { describe, mult, prob } from "../treasureDescription.js";
import { rollProbabilityFailsSkip } from "../treasureProbability.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 6,
  rarity: "common",
  description: describe(mult("x3"), "倍率", "；在关卡完成时", prob("1/1000"), "的概率摧毁自身"),
  poolPrerequisite: { type: "treasure29SelfDestructed" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep() {
    return { multMul: 3 };
  },
  async onLevelComplete(ctx) {
    const rng = ctx.rng ?? Math.random;
    if (rollProbabilityFailsSkip(1, 1000, rng, ctx.ownedSlotTreasureIds)) return;
    if (ctx.treasureRun) ctx.treasureRun.probabilityEffectTriggered = true;
    if (ctx.destroyTreasureSlotById) await ctx.destroyTreasureSlotById("54");
    else ctx.clearTreasureSlotById?.("54");
  },
};
