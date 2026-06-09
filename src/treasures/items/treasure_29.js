import { describe, mult, prob } from "../treasureDescription.js";
import { rollProbabilityFailsSkip } from "../treasureProbability.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe(mult("+50"), "倍率", "；在关卡完成时", prob("1/6"), "的概率爆炸"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  resolveSelfDestructBubble() {
    return { text: "爆炸！", kind: "bomb-blast" };
  },
  buildPostLetterStep() {
    return { multAdd: 50 };
  },
  async onLevelComplete(ctx) {
    const rng = ctx.rng ?? Math.random;
    if (rollProbabilityFailsSkip(1, 6, rng, ctx.ownedSlotTreasureIds)) return;
    if (ctx.treasureRun) {
      ctx.treasureRun.treasure29SelfDestructed = true;
      ctx.treasureRun.probabilityEffectTriggered = true;
    }
    if (ctx.destroyTreasureSlotById) await ctx.destroyTreasureSlotById("29");
    else ctx.clearTreasureSlotById?.("29");
  },
};
