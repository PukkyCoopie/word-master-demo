import { describe } from "../treasureDescription.js";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("如果用尽拼写次数时达到了所需分数的25%，摧毁自身并使你获得3次拼写机会"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  onSuccessfulWordSubmit(ctx) {
    const remainingAfter = Math.max(0, Math.floor(Number(ctx.remainingWordsAfterSubmit) ?? -1));
    if (remainingAfter > 0) return;
    const target = Math.max(1, Math.floor(Number(ctx.targetScore) || 0));
    const score = Math.max(0, Math.floor(Number(ctx.currentScore) || 0));
    if (score < target * 0.25) return;
    ctx.addRemainingWords?.(3);
    ctx.destroySelf?.();
  },
};
