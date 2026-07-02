import { describe } from "../treasureDescription.js";
import { addScore, scoreGte } from "../../utils/scoreInteger.js";

const ID = "67";

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("当用尽了拼写次数时，摧毁自身以补充3次"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const remainingAfter = Math.max(0, Math.floor(Number(ctx.remainingWordsAfterSubmit) ?? -1));
    if (remainingAfter > 0) return;
    const scoreAfter = addScore(ctx.currentScore, ctx.handFinalScore);
    if (scoreGte(scoreAfter, ctx.targetScore)) return;
    await ctx.playOwnedTreasureBubbleFx?.(ID, "+3", "score");
    ctx.addRemainingWords?.(3);
    await ctx.destroyTreasureSlotById?.(ID);
  },
};
