import { concept, describe, prob } from "../treasureDescription.js";
import { rollProbabilitySuccess } from "../treasureProbability.js";

const ID = "39";
const UPGRADE_FX_DELAY_MS = 300;

/** @type {import('../treasureTypes.js').TreasureDef} */
export default {
  price: 5,
  rarity: "rare",
  description: describe("有", prob("1/4"), "的几率", concept("升级"), "拼写单词的长度等级"),
};

/** @type {import('../treasureTypes.js').TreasureHooks} */
export const treasureHooks = {
  async onSuccessfulWordSubmit(ctx) {
    const rng = ctx.rng ?? Math.random;
    if (!rollProbabilitySuccess(1, 4, rng, ctx.ownedSlotTreasureIds)) return;
    const len = Math.max(0, Math.round(Number(ctx.judgedWordLength) || 0));
    if (len < 3 || len > 16) return;
    const runFx = async () => {
      const wobbleTask =
        typeof ctx.playOwnedTreasureWobbleOnlyFx === "function"
          ? ctx.playOwnedTreasureWobbleOnlyFx(ID)
          : Promise.resolve(ctx.wobbleOwnedTreasureById?.(ID));
      const bubbleTask =
        typeof ctx.playOwnedTreasureBubbleOnlyFx === "function"
          ? ctx.playOwnedTreasureBubbleOnlyFx(ID, "升级", "upgrade")
          : Promise.resolve(ctx.playOwnedTreasureBubbleFx?.(ID, "升级", "upgrade"));
      await Promise.all([bubbleTask, wobbleTask]);
      await new Promise((resolve) => setTimeout(resolve, UPGRADE_FX_DELAY_MS));
      if (typeof ctx.runSingleInRunLengthUpgradeFx === "function") {
        await ctx.runSingleInRunLengthUpgradeFx(len);
        return;
      }
      ctx.bumpWordLengthLevel?.(len);
    };
    if (typeof ctx.registerSubmitPostScoreClearFx === "function") {
      ctx.registerSubmitPostScoreClearFx(runFx);
      return;
    }
    await runFx();
  },
};
