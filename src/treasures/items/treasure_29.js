import { describe, mult } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "common",
  description: describe(mult("+20"), "倍率", "，在关卡完成时1/6的概率摧毁自身"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  buildPostLetterStep() {
    return { multAdd: 20 };
  },
  async onLevelComplete(ctx) {
    const rng = ctx.rng ?? Math.random;
    if (rng() >= 1 / 6) return;
    if (ctx.treasureRun) ctx.treasureRun.treasure29SelfDestructed = true;
    ctx.clearTreasureSlotById?.("29");
  },
};
