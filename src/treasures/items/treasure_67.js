import { describe } from "../treasureDescription.js";
import {
  addScore,
  ceilScoreProduct,
  scoreGte,
  scoreLt,
} from "../../utils/scoreInteger.js";

const ID = "67";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("如果用尽拼写次数时达到了所需分数的25%，摧毁自身并使你获得3次拼写机会"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  bypassNoSellForSelfDestruct: true,
  async onSuccessfulWordSubmit(ctx) {
    const remainingAfter = Math.max(0, Math.floor(Number(ctx.remainingWordsAfterSubmit) ?? -1));
    if (remainingAfter > 0) return;
    const scoreAfter = addScore(ctx.currentScore, ctx.handFinalScore);
    if (scoreGte(scoreAfter, ctx.targetScore)) return;
    const minScore = ceilScoreProduct(ctx.targetScore, 0.25);
    if (scoreLt(scoreAfter, minScore)) return;
    await ctx.playOwnedTreasureBubbleFx?.(ID, "+3", "score");
    ctx.addRemainingWords?.(3);
    await ctx.destroyTreasureSlotById?.(ID);
  },
};
