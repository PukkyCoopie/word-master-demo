import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 4,
  rarity: "common",
  description: describe(mult("x3"), "倍率", "；在关卡完成时1/1000的概率摧毁自身"),
  poolPrerequisite: { type: "treasure29SelfDestructed" },
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep() {
    return { multMul: 3 };
  },
  async onLevelComplete(ctx) {
    const rng = ctx.rng ?? Math.random;
    if (rng() >= 1 / 1000) return;
    if (ctx.treasureRun) ctx.treasureRun.probabilityEffectTriggered = true;
    ctx.clearTreasureSlotById?.("54");
  },
};
